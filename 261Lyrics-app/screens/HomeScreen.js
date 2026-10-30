import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radius, spacing } from '../theme';
import { useAppAlert } from '../components/AppAlert';

const logo = require('../images/logo.png');

const formatMusicCount = (n) => `${n} música${n === 1 ? '' : 's'}`;

const TENTATIVAS_BUSCA = 7;
const CHAVE_CACHE_BUSCA = '@busca_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // resultado de busca vale por 7 dias
const CACHE_MAX_ENTRADAS = 50; // evita o cache crescer sem limite no AsyncStorage

// A lrclib devolve, pra cada resultado, a letra em 3 formatos (plainLyrics,
// syncedLyrics e lyricsfile) — só usamos plainLyrics. Os outros dois sozinhos
// já respondem por ~80% do tamanho da resposta, então tiramos antes de
// guardar (no estado e no cache), sem perder nada que o app realmente usa.
const enxugarResultado = (item) => {
    const { syncedLyrics, lyricsfile, ...resto } = item;
    return resto;
};
const enxugarResultados = (lista) => (Array.isArray(lista) ? lista.map(enxugarResultado) : lista);

export default function HomeScreen({ navigation }) {
    const showAlert = useAppAlert();
    const [query, setQuery] = useState('');
    const [letras, setLetras] = useState([]);
    const [loading, setLoading] = useState(false); // novo estado
    const [tentativaAtual, setTentativaAtual] = useState(0);
    const [setLists, setSetLists] = useState([]);
    const cacheBuscaRef = useRef({});

    // Carrega o cache de buscas salvo de sessões anteriores.
    useEffect(() => {
        AsyncStorage.getItem(CHAVE_CACHE_BUSCA).then(json => {
            if (json) {
                try {
                    cacheBuscaRef.current = JSON.parse(json);
                } catch (e) {
                    console.error('Erro ao ler cache de busca', e);
                }
            }
        });
    }, []);

    // Guarda o resultado da busca no cache (memória + AsyncStorage), mantendo
    // só as entradas mais recentes.
    const salvarNoCacheBusca = (chave, data) => {
        const atualizado = {
            ...cacheBuscaRef.current,
            [chave]: { data, timestamp: Date.now() },
        };
        const maisRecentes = Object.entries(atualizado)
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, CACHE_MAX_ENTRADAS);
        const limitado = Object.fromEntries(maisRecentes);
        cacheBuscaRef.current = limitado;
        AsyncStorage.setItem(CHAVE_CACHE_BUSCA, JSON.stringify(limitado)).catch(e =>
            console.error('Erro ao salvar cache de busca', e)
        );
    };

    // Recarrega os SetLists sempre que a Home ganha foco, pra refletir
    // criações/exclusões feitas na aba SetLists.
    useFocusEffect(
        useCallback(() => {
            const carregarSetLists = async () => {
                try {
                    const jsonValue = await AsyncStorage.getItem('@setlists');
                    setSetLists(jsonValue != null ? JSON.parse(jsonValue) : []);
                } catch (e) {
                    console.error('Erro ao carregar SetLists', e);
                }
            };
            carregarSetLists();
        }, [])
    );

    const visualizarSetList = (item) => {
        const setListComMusicas = { ...item, musicas: item.musicas || [] };
        // `initial: false` garante que a listagem (SetListsMain) fique por
        // baixo na pilha de navegação mesmo se a aba SetLists nunca tiver
        // sido aberta nesta sessão — sem isso, o botão voltar não teria pra
        // onde ir. Tudo em uma única navegação (sem o hack de duas chamadas
        // com setTimeout), evitando a transição dupla/bugada.
        navigation.navigate('SetLists', {
            screen: 'SetListMusicas',
            params: { setList: setListComMusicas },
            initial: false,
        });
    };

    const buscarLetra = async () => {
        // Evita empilhar buscas: enquanto uma já está em andamento, ignora
        // novos toques (o botão também fica desabilitado nesse meio tempo).
        if (loading) return;

        if (!query.trim()) {
            showAlert('Atenção', 'Digite algo para buscar.');
            return;
        }

        const chaveCache = query.trim().toLowerCase();
        const emCache = cacheBuscaRef.current[chaveCache];

        // Resultado em cache e ainda válido: mostra na hora, sem chamar a API.
        if (emCache && Date.now() - emCache.timestamp < CACHE_TTL_MS) {
            setLetras(emCache.data);
            return;
        }

        setLoading(true); // começa carregamento
        setTentativaAtual(1);
        const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        // A lrclib costuma devolver 503 "ServerOverloaded" por alguns segundos
        // em picos de uso (confirmado direto na API, fora do app) — mais
        // tentativas e respeitar o Retry-After do servidor resolve a maioria.
        try {
            for (let i = 1; i <= TENTATIVAS_BUSCA; i++) {
                setTentativaAtual(i);
                try {
                    const response = await axios.get(url, {
                        timeout: 15000,
                        // O User-Agent padrão do Android (okhttp) é bloqueado pela lrclib (520).
                        // A doc da lrclib exige nome+versão+contato pra contar como "cliente
                        // identificado" (limite maior: ~90 req/min em vez de ~45 por IP).
                        headers: {
                            'User-Agent': '261Lyrics-app/1.0.0 (douglas_sd0@outlook.com)',
                            'Lrclib-Client': '261Lyrics-app/1.0.0 (douglas_sd0@outlook.com)',
                        },
                    });
                    const resultados = enxugarResultados(response.data);
                    setLetras(resultados);
                    salvarNoCacheBusca(chaveCache, resultados);
                    return;
                } catch (error) {
                    const status = error.response?.status;
                    // 429 (rate limit) e 5xx (ex: 503, 520) e falhas de rede são
                    // temporários: tenta de novo. A doc da lrclib exige respeitar
                    // o Retry-After nesses casos (inclusive no 429, senão corre
                    // risco de banimento temporário do IP).
                    const temporario = !status || status === 429 || status >= 500;
                    if (!temporario || i === TENTATIVAS_BUSCA) throw error;
                    const retryAfter = Number(error.response?.headers?.['retry-after']);
                    // Jitter aleatório (recomendado pela doc) pra não bater todo
                    // mundo no mesmo instante exato quando o servidor libera.
                    const jitter = 1 + Math.random() * 0.3;
                    // Alguns termos (ex: bandas com catálogo grande) deixam a
                    // busca genérica da lrclib sobrecarregada por bem mais que
                    // alguns segundos (~20s em testes) — por isso a espera cresce
                    // a cada tentativa, em vez de usar sempre o mínimo do
                    // Retry-After, dando tempo real pro servidor se recuperar.
                    const base = retryAfter > 0 ? retryAfter * 1000 : 1000;
                    const espera = base * i * jitter;
                    await new Promise(r => setTimeout(r, espera));
                }
            }
        } catch (error) {
            console.error('Erro ao buscar letras:', error.message);
            // API fora do ar mesmo depois de tentar várias vezes: se tiver um
            // resultado antigo em cache (mesmo vencido), melhor mostrar ele
            // do que nada.
            if (emCache) {
                setLetras(emCache.data);
                showAlert(
                    'Mostrando resultado salvo',
                    'Não foi possível atualizar agora, então exibimos a última busca salva para esse termo.'
                );
            } else {
                setLetras([]);
                showAlert(
                    'Erro',
                    'O servidor de letras está instável no momento. Tente novamente em instantes.',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Tentar novamente', onPress: () => buscarLetra() },
                    ]
                );
            }
        } finally {
            setLoading(false); // termina carregamento
            setTentativaAtual(0);
        }
    };

    const sanitizeNomeArquivo = (texto) => (texto || '').replace(/[\\/:*?"<>|]/g, '-').trim();

    const baixarLetra = async (item) => {
        const nomeArquivo = `${sanitizeNomeArquivo(item.artistName)} - ${sanitizeNomeArquivo(item.trackName)}.txt`;
        const caminho = FileSystem.documentDirectory + nomeArquivo;
        try {
            await FileSystem.writeAsStringAsync(
                caminho,
                item.plainLyrics || 'Letra não disponível.'
            );
            showAlert('Letra salva', `Arquivo "${nomeArquivo}" salvo com sucesso.`);
        } catch (err) {
            console.error(err);
            showAlert('Erro', 'Não foi possível salvar a letra.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.titleRow}>
                <Image source={logo} style={styles.logo} />
                <Text style={styles.titleText}>Lyrics</Text>
            </View>

            <View style={styles.inputWrapper}>
                <MaterialIcons name="search" size={22} color={colors.placeholder} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Digite artista, música ou ambos"
                    placeholderTextColor={colors.placeholder}
                    value={query}
                    onChangeText={(text) => {
                        setQuery(text);
                        // Campo limpo: volta a mostrar os SetLists em vez dos resultados antigos.
                        if (!text.trim()) setLetras([]);
                    }}
                    returnKeyType="search"
                    onSubmitEditing={buscarLetra}
                />
            </View>

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDesabilitado]}
                onPress={buscarLetra}
                activeOpacity={0.8}
                disabled={loading}
            >
                <Text style={styles.buttonText}>Buscar</Text>
            </TouchableOpacity>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.text, marginTop: 10 }}>
                        {tentativaAtual > 1
                            ? `O servidor de letras está devagar, tentando de novo (${tentativaAtual}/${TENTATIVAS_BUSCA})...`
                            : 'Carregando...'}
                    </Text>
                </View>
            ) : letras.length > 0 ? (
                <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
                    {letras.map((item, index) => (
                        <View key={index} style={styles.resultItem}>
                            <Text style={styles.songTitle}>
                                {item.artistName} - {item.trackName}
                            </Text>

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={styles.visualizarBtn}
                                    activeOpacity={0.8}
                                    onPress={() =>
                                        navigation.navigate('Letra', { letra: item })
                                    }
                                >
                                    <Text style={styles.actionText}>Visualizar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.baixarBtn}
                                    activeOpacity={0.8}
                                    onPress={() => baixarLetra(item)}
                                >
                                    <Text style={styles.actionTextPrimary}>Baixar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
                    <Text style={styles.sectionTitle}>SetLists Atuais</Text>
                    {setLists.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="playlist-play" size={40} color={colors.placeholder} />
                            <Text style={styles.semResultados}>Nenhum SetList criado ainda.</Text>
                        </View>
                    ) : (
                        setLists.map((item) => (
                            <View key={item.id} style={styles.resultItem}>
                                <View style={styles.setListHeaderRow}>
                                    <Text style={styles.songTitle}>{item.name}</Text>
                                    <Text style={styles.musicCount}>
                                        {formatMusicCount((item.musicas || []).length)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.visualizarBtnFull}
                                    activeOpacity={0.8}
                                    onPress={() => visualizarSetList(item)}
                                >
                                    <Text style={styles.actionText}>Visualizar</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: spacing.xxl,
        paddingHorizontal: spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
    },
    logo: {
        width: 70,
        height: 50,
        marginRight: 10,
    },
    titleText: {
        color: colors.text,
        fontSize: 32,
        fontWeight: 'bold',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        color: colors.text,
        paddingVertical: 16,
    },
    button: {
        backgroundColor: colors.primary,
        padding: 14,
        borderRadius: radius.md,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    buttonDesabilitado: {
        opacity: 0.5,
    },
    buttonText: {
        color: colors.background,
        fontWeight: 'bold',
        fontSize: 16,
    },
    results: {
        flex: 1,
    },
    resultItem: {
        backgroundColor: colors.surface,
        marginBottom: spacing.sm,
        borderRadius: radius.md,
        padding: spacing.md,
    },
    songTitle: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: spacing.sm,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    visualizarBtn: {
        backgroundColor: colors.surfaceAlt,
        padding: 10,
        borderRadius: radius.pill,
        flex: 1,
        marginRight: 5,
        alignItems: 'center',
    },
    visualizarBtnFull: {
        backgroundColor: colors.surfaceAlt,
        padding: 10,
        borderRadius: radius.pill,
        alignItems: 'center',
    },
    setListHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    musicCount: {
        color: colors.placeholder,
        fontSize: 13,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    semResultados: {
        color: colors.placeholder,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    baixarBtn: {
        backgroundColor: colors.primary,
        padding: 10,
        borderRadius: radius.pill,
        flex: 1,
        marginLeft: 5,
        alignItems: 'center',
    },
    actionText: {
        color: colors.text,
        fontWeight: 'bold',
    },
    actionTextPrimary: {
        color: colors.background,
        fontWeight: 'bold',
    },
});
