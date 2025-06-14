import axios from 'axios';
import {
  searchWords,
  getCommonVerbs,
  getWordsByJLPTLevel,
  searchJisho,
  searchJishoByJLPT,
  searchJishoCommon,
  searchJishoByPartOfSpeech
} from '../api';
import { JishoAPIResponse, JapaneseWord, JLPTLevel } from '@/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the wanikaniApi module
jest.mock('../wanikaniApi', () => ({
  setWanikaniApiToken: jest.fn(),
  searchWanikaniVocabulary: jest.fn(),
  getCommonVerbsFromWanikani: jest.fn(),
  getWordsByJLPTLevelFromWanikani: jest.fn(),
}));

// Mock the jishoData module
jest.mock('../jishoData', () => ({
  getFallbackData: jest.fn(),
}));

import * as wanikaniApi from '../wanikaniApi';
import * as jishoData from '../jishoData';

const mockWanikaniApi = wanikaniApi as jest.Mocked<typeof wanikaniApi>;
const mockJishoData = jishoData as jest.Mocked<typeof jishoData>;

describe('API Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset axios mocks
    mockedAxios.get.mockReset();
    mockedAxios.create.mockReset();

    // Reset WaniKani API mocks
    mockWanikaniApi.searchWanikaniVocabulary.mockReset();
    mockWanikaniApi.getCommonVerbsFromWanikani.mockReset();
    mockWanikaniApi.getWordsByJLPTLevelFromWanikani.mockReset();

    // Reset Jisho data mock
    mockJishoData.getFallbackData.mockReset();
  });

  describe('searchWords', () => {
    const mockJishoResponse: JishoAPIResponse = {
      meta: { status: 200 },
      data: [
        {
          slug: 'taberu',
          is_common: true,
          tags: [],
          jlpt: ['jlpt-n5'],
          japanese: [{ word: '食べる', reading: 'たべる' }],
          senses: [
            {
              english_definitions: ['to eat'],
              parts_of_speech: ['Ichidan verb'],
              tags: []
            }
          ]
        },
        {
          slug: 'nomu',
          is_common: true,
          tags: [],
          jlpt: ['jlpt-n5'],
          japanese: [{ word: '飲む', reading: 'のむ' }],
          senses: [
            {
              english_definitions: ['to drink'],
              parts_of_speech: ['Godan verb'],
              tags: []
            }
          ]
        }
      ]
    };

    const mockWanikaniResults: JapaneseWord[] = [
      {
        id: 'wk-1',
        kanji: '食べる',
        kana: 'たべる',
        romaji: 'taberu',
        meaning: 'to eat',
        type: 'Ichidan',
        jlpt: 'N5'
      }
    ];

    test('should return WaniKani results when available', async () => {
      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue(mockWanikaniResults);

      const results = await searchWords('食べる', 10);

      expect(mockWanikaniApi.searchWanikaniVocabulary).toHaveBeenCalledWith('食べる', 10);
      expect(results).toEqual(mockWanikaniResults);
    });

    test('should fallback to Jisho API when WaniKani returns no results', async () => {
      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: mockJishoResponse });

      const results = await searchWords('食べる', 10);

      expect(mockWanikaniApi.searchWanikaniVocabulary).toHaveBeenCalledWith('食べる', 10);
      expect(mockedAxios.get).toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results[0].kanji).toBe('食べる');
      expect(results[0].type).toBe('Ichidan');
    });

    test('should use CORS proxy when direct Jisho call fails', async () => {
      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);

      // Mock direct call to fail
      mockedAxios.get.mockRejectedValueOnce(new Error('CORS error'));

      // Mock axios.create to return an object with get method
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: mockJishoResponse })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const results = await searchWords('食べる', 10);

      expect(mockedAxios.create).toHaveBeenCalled();
      expect(mockAxiosInstance.get).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    test('should use fallback data when all API calls fail', async () => {
      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const mockAxiosInstance = {
        get: jest.fn().mockRejectedValue(new Error('Proxy error'))
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      mockJishoData.getFallbackData.mockReturnValue(mockJishoResponse as any);

      const results = await searchWords('食べる', 10);

      expect(mockJishoData.getFallbackData).toHaveBeenCalledWith('食べる');
      expect(results).toHaveLength(2);
    });

    test('should handle empty search query', async () => {
      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: { meta: { status: 200 }, data: [] } });

      const results = await searchWords('', 10);

      expect(results).toEqual([]);
    });

    test('should filter results by conjugatable word types', async () => {
      const mockResponseWithNoun: JishoAPIResponse = {
        meta: { status: 200 },
        data: [
          {
            slug: 'hon',
            is_common: true,
            tags: [],
            jlpt: ['jlpt-n5'],
            japanese: [{ word: '本', reading: 'ほん' }],
            senses: [
              {
                english_definitions: ['book'],
                parts_of_speech: ['noun'],
                tags: []
              }
            ]
          },
          {
            slug: 'taberu',
            is_common: true,
            tags: [],
            jlpt: ['jlpt-n5'],
            japanese: [{ word: '食べる', reading: 'たべる' }],
            senses: [
              {
                english_definitions: ['to eat'],
                parts_of_speech: ['Ichidan verb'],
                tags: []
              }
            ]
          }
        ]
      };

      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: mockResponseWithNoun });

      const results = await searchWords('test', 10);

      // Should include both noun and verb
      expect(results).toHaveLength(2);
      expect(results.find(w => w.type === 'noun')).toBeTruthy();
      expect(results.find(w => w.type === 'Ichidan')).toBeTruthy();
    });
  });

  describe('getCommonVerbs', () => {
    const mockCommonVerbs: JapaneseWord[] = [
      {
        id: 'common-1',
        kanji: '食べる',
        kana: 'たべる',
        romaji: 'taberu',
        meaning: 'to eat',
        type: 'Ichidan',
        jlpt: 'N5'
      },
      {
        id: 'common-2',
        kanji: '飲む',
        kana: 'のむ',
        romaji: 'nomu',
        meaning: 'to drink',
        type: 'Godan',
        jlpt: 'N5'
      }
    ];

    test('should return WaniKani common verbs when available', async () => {
      mockWanikaniApi.getCommonVerbsFromWanikani.mockResolvedValue(mockCommonVerbs);

      const results = await getCommonVerbs(10);

      expect(mockWanikaniApi.getCommonVerbsFromWanikani).toHaveBeenCalled();
      expect(results).toEqual(mockCommonVerbs);
    });

    test('should fallback to Jisho search when WaniKani fails', async () => {
      mockWanikaniApi.getCommonVerbsFromWanikani.mockResolvedValue([]);

      // Mock multiple search calls for common verb queries
      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue(mockCommonVerbs);

      const results = await getCommonVerbs(10);

      expect(results).toEqual(mockCommonVerbs);
    });

    test('should remove duplicate verbs', async () => {
      const duplicateVerbs = [
        ...mockCommonVerbs,
        { ...mockCommonVerbs[0] } // Duplicate
      ];

      mockWanikaniApi.getCommonVerbsFromWanikani.mockResolvedValue([]);
      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue(duplicateVerbs);

      const results = await getCommonVerbs(50);

      // Should have unique verbs only
      const uniqueKanji = new Set(results.map(w => w.kanji));
      expect(uniqueKanji.size).toBe(results.length);
    });

    test('should handle API errors gracefully', async () => {
      mockWanikaniApi.getCommonVerbsFromWanikani.mockRejectedValue(new Error('API error'));
      mockWanikaniApi.searchWanikaniVocabulary.mockRejectedValue(new Error('API error'));

      const results = await getCommonVerbs(10);

      expect(results).toEqual([]);
    });
  });

  describe('getWordsByJLPTLevel', () => {
    const mockN5Words: JapaneseWord[] = [
      {
        id: 'n5-1',
        kanji: '食べる',
        kana: 'たべる',
        romaji: 'taberu',
        meaning: 'to eat',
        type: 'Ichidan',
        jlpt: 'N5'
      }
    ];

    test('should return WaniKani JLPT words when available', async () => {
      mockWanikaniApi.getWordsByJLPTLevelFromWanikani.mockResolvedValue(mockN5Words);

      const results = await getWordsByJLPTLevel('N5', 20);

      expect(mockWanikaniApi.getWordsByJLPTLevelFromWanikani).toHaveBeenCalledWith('N5');
      expect(results).toEqual(mockN5Words);
    });

    test('should work for different JLPT levels', async () => {
      const levels: JLPTLevel[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

      for (const level of levels) {
        mockWanikaniApi.getWordsByJLPTLevelFromWanikani.mockResolvedValue([]);
        mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);

        await getWordsByJLPTLevel(level, 10);

        expect(mockWanikaniApi.getWordsByJLPTLevelFromWanikani).toHaveBeenCalledWith(level);
      }
    });

    test('should filter results by JLPT level', async () => {
      const mixedLevelWords = [
        { ...mockN5Words[0], jlpt: 'N5' as JLPTLevel },
        { ...mockN5Words[0], id: 'n4-1', jlpt: 'N4' as JLPTLevel }
      ];

      mockWanikaniApi.getWordsByJLPTLevelFromWanikani.mockResolvedValue([]);
      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue(mixedLevelWords);

      const results = await getWordsByJLPTLevel('N5', 30);

      const n5Words = results.filter(w => w.jlpt === 'N5');
      expect(n5Words.length).toBeGreaterThan(0);
    });
  });

  describe('searchJisho', () => {
    const mockJishoResponse: JishoAPIResponse = {
      meta: { status: 200 },
      data: []
    };

    test('should make direct API call successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockJishoResponse });

      const result = await searchJisho('test');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('keyword=test&page=1')
      );
      expect(result).toEqual(mockJishoResponse);
    });

    test('should include tags in query when provided', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockJishoResponse });

      await searchJisho('test', 1, ['common', 'jlpt-n5']);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('tags=common%2Cjlpt-n5')
      );
    });

    test('should use CORS proxy on direct call failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('CORS error'));

      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: mockJishoResponse })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const result = await searchJisho('test');

      expect(mockedAxios.create).toHaveBeenCalled();
      expect(mockAxiosInstance.get).toHaveBeenCalled();
      expect(result).toEqual(mockJishoResponse);
    });

    test('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const mockAxiosInstance = {
        get: jest.fn().mockRejectedValue(new Error('Proxy error'))
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      await expect(searchJisho('test')).rejects.toThrow('Failed to fetch data from Jisho API');
    });
  });

  describe('searchJishoByJLPT', () => {
    test('should search with correct JLPT tag', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { meta: { status: 200 }, data: [] }
      });

      await searchJishoByJLPT('N5', 20);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('tags=jlpt-n5')
      );
    });

    test('should handle different JLPT levels', async () => {
      const levels: JLPTLevel[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

      for (const level of levels) {
        mockedAxios.get.mockResolvedValue({
          data: { meta: { status: 200 }, data: [] }
        });

        await searchJishoByJLPT(level, 10);

        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining(`jlpt-${level.toLowerCase()}`)
        );
      }
    });
  });

  describe('searchJishoCommon', () => {
    test('should search with common tag', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { meta: { status: 200 }, data: [] }
      });

      await searchJishoCommon(20);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('tags=common')
      );
    });
  });

  describe('searchJishoByPartOfSpeech', () => {
    test('should search with part of speech parameter', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { meta: { status: 200 }, data: [] }
      });

      await searchJishoByPartOfSpeech('verb', 20);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('keyword=verb')
      );
    });
  });

  describe('Word Type Detection', () => {
    test('should correctly identify Ichidan verbs', async () => {
      const mockResponse: JishoAPIResponse = {
        meta: { status: 200 },
        data: [
          {
            slug: 'taberu',
            is_common: true,
            tags: [],
            jlpt: ['jlpt-n5'],
            japanese: [{ word: '食べる', reading: 'たべる' }],
            senses: [
              {
                english_definitions: ['to eat'],
                parts_of_speech: ['Ichidan verb', 'transitive verb'],
                tags: []
              }
            ]
          }
        ]
      };

      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const results = await searchWords('食べる', 1);

      expect(results[0].type).toBe('Ichidan');
    });

    test('should correctly identify Godan verbs', async () => {
      const mockResponse: JishoAPIResponse = {
        meta: { status: 200 },
        data: [
          {
            slug: 'nomu',
            is_common: true,
            tags: [],
            jlpt: ['jlpt-n5'],
            japanese: [{ word: '飲む', reading: 'のむ' }],
            senses: [
              {
                english_definitions: ['to drink'],
                parts_of_speech: ['Godan verb', 'transitive verb'],
                tags: []
              }
            ]
          }
        ]
      };

      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const results = await searchWords('飲む', 1);

      expect(results[0].type).toBe('Godan');
    });

    test('should correctly identify irregular verbs', async () => {
      const mockResponse: JishoAPIResponse = {
        meta: { status: 200 },
        data: [
          {
            slug: 'suru',
            is_common: true,
            tags: [],
            jlpt: ['jlpt-n5'],
            japanese: [{ word: 'する', reading: 'する' }],
            senses: [
              {
                english_definitions: ['to do'],
                parts_of_speech: ['irregular verb', 'suru verb'],
                tags: []
              }
            ]
          }
        ]
      };

      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const results = await searchWords('する', 1);

      expect(results[0].type).toBe('Irregular');
    });

    test('should correctly identify i-adjectives', async () => {
      const mockResponse: JishoAPIResponse = {
        meta: { status: 200 },
        data: [
          {
            slug: 'takai',
            is_common: true,
            tags: [],
            jlpt: ['jlpt-n5'],
            japanese: [{ word: '高い', reading: 'たかい' }],
            senses: [
              {
                english_definitions: ['high', 'expensive'],
                parts_of_speech: ['i-adjective'],
                tags: []
              }
            ]
          }
        ]
      };

      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const results = await searchWords('高い', 1);

      expect(results[0].type).toBe('i-adjective');
    });

    test('should correctly identify na-adjectives', async () => {
      const mockResponse: JishoAPIResponse = {
        meta: { status: 200 },
        data: [
          {
            slug: 'kirei',
            is_common: true,
            tags: [],
            jlpt: ['jlpt-n5'],
            japanese: [{ word: '綺麗', reading: 'きれい' }],
            senses: [
              {
                english_definitions: ['beautiful', 'clean'],
                parts_of_speech: ['na-adjective'],
                tags: []
              }
            ]
          }
        ]
      };

      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const results = await searchWords('綺麗', 1);

      expect(results[0].type).toBe('na-adjective');
    });
  });

  describe('JLPT Level Detection', () => {
    test('should correctly determine JLPT levels', async () => {
      const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

      for (const level of levels) {
        const mockResponse: JishoAPIResponse = {
          meta: { status: 200 },
          data: [
            {
              slug: `test-${level}`,
              is_common: true,
              tags: [],
              jlpt: [`jlpt-${level.toLowerCase()}`],
              japanese: [{ word: 'テスト', reading: 'てすと' }],
              senses: [
                {
                  english_definitions: ['test'],
                  parts_of_speech: ['noun'],
                  tags: []
                }
              ]
            }
          ]
        };

        mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
        mockedAxios.get.mockResolvedValue({ data: mockResponse });

        const results = await searchWords(`test-${level}`, 1);

        expect(results[0].jlpt).toBe(level);
      }
    });

    test('should default to N5 for words without JLPT level', async () => {
      const mockResponse: JishoAPIResponse = {
        meta: { status: 200 },
        data: [
          {
            slug: 'unknown',
            is_common: false,
            tags: [],
            jlpt: [],
            japanese: [{ word: '未知', reading: 'みち' }],
            senses: [
              {
                english_definitions: ['unknown'],
                parts_of_speech: ['noun'],
                tags: []
              }
            ]
          }
        ]
      };

      mockWanikaniApi.searchWanikaniVocabulary.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const results = await searchWords('未知', 1);

      expect(results[0].jlpt).toBe('N5');
    });
  });
});
