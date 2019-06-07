/**
 * @file options
 * @author solopea@gmail.com
 */

import Vue from 'vue'
import ElementUI from 'element-ui'
import _ from 'underscore'
import 'element-ui/lib/theme-default/index.css'
import './options.scss'
import changelog from '../../js/info/changelog'
import browser from 'webextension-polyfill'
import { getSyncConfig, getUserInfo, saveUserInfo } from '../../js/common/config'
import { WORD_LEVEL, CARD_FONTSIZE_OPTIONS } from '../../js/constant/options'
import * as Validator from '../../js/common/validatorHelper'
import Pie from '../../js/components/pieChart'
import Translate from '../../js/translate'
import { TRANSLATE_ENGINS } from '../../js/constant/options'
import { getParameterByName } from '../../js/common/utils'
import wordRoots from '../../js/constant/wordroots'
import keyboardJS from 'keyboardjs'
import SocialSharing  from 'vue-social-sharing'
import API from '../../js/api'
import { Base64 } from 'js-base64'
import URI from 'urijs'
import { codeList } from '../../js/constant/code'
import * as i18n from '../../js/i18n/options'
import { syncMixin } from '../../js/helper/syncData'

Vue.use(SocialSharing);

const manifest = browser.runtime.getManifest();
const version = manifest.version;
const appName = 'wordcard';
const storeId = 'oegblnjiajbfeegijlnblepdodmnddbk';
let final = [];

Vue.use(ElementUI)

function init() {
    Promise.all([
        getSyncConfig(),
        getUserInfo()
    ]).then(([config, userInfo]) => {
        let i18nTexts = getI18nTexts();

        render(config, userInfo, i18nTexts);
    });
}

function getI18nTexts(obj) {
    let texts = {};

    try {
        for (let cate in obj) {
            let subobj = texts[cate] = {};

            for (var key in obj[cate]) {
                subobj[key] = browser.i18n.getMessage(`${cate}_${key}`);
            }
        }
    } catch (e) {
        console.log(e);
    }

    return texts;
}

const levels = [0, 1, 2, 3, 4, 5].map(level => {
    return {
        label: level,
        value: level
    }
});
const filterKeyMap = {
    list: 'filter',
    recite: 'reciteFilter'
};
const reciteStages = [
    'name',
    'sentence',
    'trans'
];

const tabs = ['general', 'words', 'wordsrecite', 'wordroots', 'advanced', 'help', 'update', 'about'];

function render(config, userInfo, i18nTexts) {
    let activeName = getParameterByName('tab') || 'general';
    
    if (config.version < version) {
        config.version = version;
        activeName = 'update';
    }

    const app = new Vue({
        el: '#app',
        data: function() {
            return {
                i18n,
                // tab
                activeName,
                // base info
                changelog,
                appName,
                storeId,
                config,
                codeList,
                i18nTexts,
                CARD_FONTSIZE_OPTIONS,
                TRANSLATE_ENGINS,
                userInfo,
                // list
                words: [],
                langPairs: [],
                filter: {
                    wordSearchText: '',
                    levels: [],
                    tags: [],
                    langPair: ''
                },
                tags: [],
                allTags: [],
                tagInputVisible: false,
                tagInputValue: '',
                levels,
                wordEditorVisible: false,
                wordForm: {
                    name: '',
                    trans: '',
                    sentence: '',
                    tags: [],
                    level: 0
                },
                wordRules: {
                    name: Validator.text(i18n.item.word),
                    trans: Validator.text(i18n.item.translate)
                },
                // recite
                wordrecitevisible: false,
                reciteFilter: {
                    levels: [],
                    tags: [],
                    langPair: ''
                },
                reciteStage: 0,
                recitedWordIndex: 0,
                allRecited: false,
                curRecitedWord: {
                    id: '',
                    name: '',
                    level: 0,
                    trans: [],
                    sentence: ''
                },
                reciteResult: {
                    right: 0,
                    wrong: 0
                },
                // roots
                rootsFilter: {
                    searchText: 'a'
                },
                wordRoots,
                activeSyncNames: [],
                minappForm: {
                    userKey: ''
                },
                minappRules: {
                    userKey: Validator.text('userKey')
                },
                hasMinappChecked: false,

                // sync
                version
            }
        },

        components: {
            Pie
        },

        mixins: [syncMixin],

        computed: {
            filteredWords() {
                let filter = this.filter;

                return this.filterWords(filter, 'list');
            },
            filteredRoots() {
                let { searchText } = this.rootsFilter;

                let results = this.wordRoots;
                
                if (searchText) {
                    results = results.filter(({ root }) => {
                        return root.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
                    });
                }

                return results;
            },
            schemedWords() {
                let filter = this.reciteFilter;

                return this.filterWords(filter, 'recite');
            },
            isFinalStep() {
                return this.reciteStage === (reciteStages.length - 1);
            },
            reciteResultData() {
                let { right, wrong } = this.reciteResult;

                return {
                    labels: [i18n.item.right, i18n.item.wrong],
                    datasets: [
                        {
                            backgroundColor: ['#1ebe8d', '#e80d39'],
                            data: [right, wrong]
                        }
                    ]
                };
            }
        },

        watch: {
            activeName() {
                let activeName = this.activeName;

                if (activeName === 'words' || activeName === 'wordsrecite') {
                    this.loadWords();
                }
            },

            words() {
                let allTags = [];
                let langPairs = [];

                this.words.forEach(({ tags = [], from = 'en', to = 'zh-CN' }) => {
                    allTags = allTags.concat(tags);
                    langPairs.push(`${from},${to}`);
                });

                this.tags = _.uniq(allTags);
                this.langPairs = _.uniq(langPairs);
                this.allTags = this.tags.map(tag => {
                    return {
                        label: tag,
                        value: tag
                    };
                });
            }
        },
        mounted: function() {
            if (this.activeName === 'words' || this.activeName === 'wordsrecite') {
                this.loadWords();
            }

            if (activeName === 'update') {
                this.$nextTick(() => {
                    this.saveConfig(true);
                });
            }
        },
        methods: {
            handleClick: function(tab) {
            },

            handleWords(list) {
                list.forEach(item => {
                    if (item.pos) {
                        const { url, offset, path } = item.pos;
                        const tag = Base64.encodeURI(JSON.stringify({ offset, path }));
                        const link = URI(url).removeSearch('wc_tag').addSearch('wc_tag', tag);

                        item.link = link.href();
                    }
                });

                return list;
            },

            loadWords() {
                return new Promise((resolve, reject) => {
                    browser.runtime.sendMessage({
                        action: 'get'
                    }, ({ data }) => {
                        if (data) {
                            this.words = this.handleWords(data);

                            resolve(data);
                        } else {
                            resolve([]);
                        }
                    });
                });
            },

            filterWords(filter, type = 'list') {
                let { wordSearchText, levels, tags, langPair } = filter;

                if (!this.words.length) {
                    return [];
                }

                let results = this.words;

                if (wordSearchText) {
                    results = results.filter(word => {
                        // TODO: 连同sentence一起筛选
                        return word.name.toLowerCase().indexOf(wordSearchText.toLowerCase()) !== -1;
                    });
                }

                if (levels.length) {
                    results = results.filter(({ level }) => {
                        return levels.indexOf(level) !== -1;                         
                    });
                }

                if (tags.length) {
                    results = results.filter(({tags: wtags = []}) => {
                        if (!wtags.length) {
                            return false;
                        }

                        let hasTag = false;

                        tags.forEach(tag => {
                            if (wtags.indexOf(tag) > -1) {
                                hasTag = true;
                            }
                        });

                        return hasTag;
                    });
                }

                if (langPair && langPair.indexOf(',') !== -1) {
                    results = results.filter(({ from = 'en', to = 'zh-CN' }) => {
                        const arr = langPair.split(',');

                        return from === arr[0] && to === arr[1];
                    });
                }

                return results;
            },

            handleLevelFilterClick(level, type = 'list') {
                let filter = this[filterKeyMap[type]];
                let index = filter.levels.indexOf(level);

                if (index > -1) {
                    filter.levels.splice(index, 1);
                } else {
                    filter.levels.push(level);
                }
            },

            handleTagFilterClick(tag, type = 'list') {
                let filter = this[filterKeyMap[type]];
                let index = filter.tags.findIndex(item => item == tag);

                if (index > -1) {
                    filter.tags.splice(index, 1);
                } else {
                    filter.tags.push(tag);
                }
            },

            handleConfigSubmit() {
                this.saveConfig();
            },

            saveConfig: function(silent) {
                let self = this;
                let newConfig = JSON.parse(JSON.stringify(this.config));

                browser.storage.sync.set({
                    config: newConfig
                }).then(resp => {
                    if (!silent) {
                        this.$message(i18n.msg.saveok);
                    }
                });
            },

            resetFilter() {
                this.filter = {
                    wordSearchText: '',
                    levels: [],
                    tags: []
                };
            },

            handleBatchDeleteClick() {
                const words = this.filteredWords;

                if (words.length) {
                    this.$confirm(i18n.msg.deletewordsConfirm, i18n.item.tips).then(() => {
                        this.batchDelete();
                    }).catch(() => {
                        console.log('cancel');
                    });
                } else {
                    this.$message.warning(i18n.msg.nowordsToDelete);
                }
            },

            batchDelete() {
                const ids = this.filteredWords.map(word => word.id);

                chrome.runtime.sendMessage({
                    action: 'batchDelete',
                    data: { ids }
                }, () => {
                    this.$message(i18n.msg.batchDeleteOk);
                    this.resetFilter();
                    this.loadWords();
                });
            },

            handleWordClick(word) {
                this.wordEditorVisible = true;
                this.wordForm = {
                    id: word.id,
                    name: word.name,
                    trans: (word.trans || []).join(','),
                    sentence: word.sentence,
                    tags: word.tags,
                    level: word.level
                };
            },

            handleTagClose(tag) {
                this.wordForm.tags.splice(this.wordForm.tags.indexOf(tag), 1);
            },

            createFilter(queryString) {
                return (item) => {
                  return (item.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0);
                };
            },

            tagsQuerySearch(queryString, cb) {
                let allTags = this.allTags;
                let results = queryString ? allTags.filter(this.createFilter(queryString)) : allTags;

                cb(results);
            },

            handleTagSelect() {
                this.handleTagInputConfirm();
            },

            handleTagInputConfirm() {
                let tagInputValue = this.tagInputValue;
                if (tagInputValue && this.wordForm.tags.indexOf(tagInputValue) === -1) {
                  this.wordForm.tags.push(tagInputValue);
                }
                this.tagInputVisible = false;
                this.tagInputValue = '';
            },

            showTagInput() {
                this.tagInputVisible = true;
                this.$nextTick(_ => {
                    this.$refs.saveTagInput.$refs.input.$refs.input.focus();
                });
            },

            handleEditorCancelClick() {
                this.wordEditorVisible = false;
            },

            handleEditorDeleteClick() {
                browser.runtime.sendMessage({
                    action: 'remove',
                    data: { id: this.wordForm.id }
                }, () => {
                    this.$message(i18n.msg.deleteOk);
                    this.resetWordEditor();
                });
            },

            handleSyncedClick(word) {
                word.synced = false;
                this.saveWord(word);
            },

            handleWordLinkClick(link) {
                chrome.tabs.create({
                    url: link
                });
            },

            handleRootClick(word) {
                chrome.tabs.create({
                    url: `http://www.cgdict.com/index.php?app=cigen&ac=word&w=${word.name}`
                });
            },

            onWordFormSubmit() {

            },

            saveWord(word) {
                if (word && word.name) {
                    return new Promise((resolve, reject) => {
                        browser.runtime.sendMessage({
                            action: 'update',
                            data: JSON.parse(JSON.stringify(word))
                        }, (resp) => {
                            resolve(resp);
                        });
                    });
                } else {
                    return Promise.reject(null);
                }
            },

            resetWordForm() {
                this.wordForm = {
                    name: '',
                    trans: '',
                    sentence: '',
                    tags: [],
                    level: 0
                };
            },

            handleEditorSubmit() {
                this.$refs.wordForm.validate((valid) => {
                    if (!valid) {
                        this.$message.error(i18n.msg.formError);
                        return;
                    }
                    
                    let {id, name, trans, sentence, tags, level} = this.wordForm;

                    let word = {
                        id,
                        name,
                        trans: trans.split(','),
                        sentence,
                        tags,
                        level
                    };

                    this.saveWord(word).then(resp => {
                        this.resetWordEditor();
                    });
                });
            },

            resetWordEditor() {
                this.loadWords();
                this.wordEditorVisible = false;
                this.resetWordForm();
            },

            // recite
            beginRecite() {
                if (this.schemedWords.length) {
                    this.wordrecitevisible = true;
                    this.recitedWordIndex = 0;
                    this.reciteWord();
                } else {
                    this.$message({
                        message: i18n.msg.wordsChoosedNothing,
                        type: 'warning'
                    });
                }
            },

            reciteWord() {
                let stage = this.reciteStage;
                let word = this.schemedWords[this.recitedWordIndex];
                let curRecitedWord = this.curRecitedWord;
                let stageName = reciteStages[stage];

                if (stage === 0) {
                    curRecitedWord.id = word.id;
                    curRecitedWord.level = word.level;
                }

                curRecitedWord[stageName] = word[stageName];
            },

            highlightWord(sentence, word) {
                if (sentence && word) {
                    let theword = word.toLowerCase();

                    return sentence.split(' ').map(item => {
                        if (item.toLowerCase().indexOf(theword) !== -1) {
                            return `<em>${item}</em>`;
                        } else {
                            return item;
                        }
                    }).join(' ');
                } else {
                    return sentence;
                }
            },

            goNextStep() {
                let nextStage = this.reciteStage + 1;
                
                if (nextStage > (reciteStages.length - 1)) {
                    this.reciteStage = 0;

                    let nextWordIndex = this.recitedWordIndex + 1;

                    if (nextWordIndex > (this.schemedWords.length - 1)) {
                        this.allRecited = true;
                    } else {
                        this.curRecitedWord = {
                            id: '',
                            name: '',
                            level: 0,
                            trans: [],
                            sentence: ''
                        };
                        this.recitedWordIndex = this.recitedWordIndex + 1;
                    }
                } else {
                    this.reciteStage = nextStage;
                }

                if (!this.allRecited) {
                    this.reciteWord();
                }
            },

            playVoice() {
                Translate.playAudio(this.curRecitedWord.name);
            },

            wordRecited(gotit) {
                let word = this.curRecitedWord;
                let level = word.level || 0;
                let nextLevel;

                if (gotit) {
                    nextLevel = level + 1;
                    this.reciteResult.right = this.reciteResult.right + 1;
                } else {
                    nextLevel = level - 1;
                    this.reciteResult.wrong = this.reciteResult.wrong + 1;
                }

                if (nextLevel > WORD_LEVEL.DONE) {
                    nextLevel = WORD_LEVEL.DONE
                } else if (nextLevel < WORD_LEVEL.ZERO) {
                    nextLevel = WORD_LEVEL.ZERO;
                }

                word.level = nextLevel;

                browser.runtime.sendMessage({
                    action: 'update',
                    data: JSON.parse(JSON.stringify(word))
                }, () => {
                    this.goNextStep();
                });
            },

            beginNewReciteFilter() {
                this.allRecited = false;
                this.wordrecitevisible = false;
                this.curRecitedWord = {
                    id: '',
                    name: '',
                    level: 0,
                    trans: [],
                    sentence: ''
                };
                this.reciteFilter = {
                    levels: [],
                    tags: []
                };
                this.reciteResult = {
                    right: 0,
                    wrong: 0
                };
            },

            handleExportClick(format) {
                this.loadWords().then(words => this.exportWords(words, format));
            },

            download(url, name) {
                const downloadAnchorNode = document.createElement('a');

                downloadAnchorNode.setAttribute('href', url);
                downloadAnchorNode.setAttribute('download', name);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            },

            downloadAsJson(exportObj, exportName){
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));

                this.download(dataStr, exportName + '.json');
            },

            downloadAsCsv(words) {
                let csvContent = "data:text/csv;charset=utf-8,";

                words.forEach(({ name, trans = [], sentence, tags = []}, index) => {
                    let wordString = `${name};${trans.join(' ')};${sentence};${tags.join(';')}`;

                    csvContent += index < words.length ? wordString+ "\n" : wordString;
                });

                let encodedUri = encodeURI(csvContent);

                this.download(encodedUri, 'wordcard-words.csv');
            },

            downloadAsText(words = []) {
                let textContent = "data:text/plain;charset=utf-8,";
                const data = words.map(word => word.name);

                let encodedUri = encodeURI(`${textContent}${data.join('\n')}`);

                this.download(encodedUri, 'wordcard-words.txt');
            },

            exportWords(words, format) {
                if (!words.length) {
                    this.$message.warn(i18n.msg.noWordsToExport);
                    
                    return;
                }

                const obj = JSON.parse(JSON.stringify(words));

                if (format === 'csv') {
                    this.downloadAsCsv(obj);
                } else if (format === 'json') {
                    this.downloadAsJson(obj, 'wordcard-words');
                } else if (format === 'words') {
                    this.downloadAsText(obj);
                }
            },

            async handleUserCheck(type) {
                this.$refs.minappForm.validate(async valid => {
                    if (valid) {
                        const resp = await API.minapp.checkUser(this.minappForm.userKey);

                        if (resp && resp.code === 0 && resp.data) {
                            this.userInfo = resp.data;
                            this.$message.success(`身份验证成功，Hi, ${resp.data.nickname}`);
                            saveUserInfo(resp.data);
                        } else {
                            this.$message.error('查找不到匹配的用户!');
                        }
                    }
                });
            },
            
            async shouldSyncToMinapp() {
                this.$refs.minappForm.validate(async valid => {
                    if (valid) {
                        this.syncToMinapp();
                    }
                });
            },

            handleSyncClick(type) {
                if (type === 'minapp') {
                    this.shouldSyncToMinapp();
                } else if (type === 'shanbay') {
                    this.shouldSyncToShanbay();
                } else if (type === 'youdao') {
                    this.shouldSyncToYoudao();
                }
            }
        }
    });

    function bindEvents() {
        let keys = ['alt + 1', 'alt + 2', 'alt + 3', 'alt + 4', 'alt + 5', 'alt + 6', 'alt + 7', 'alt + 8'];

        keys.forEach((key, index) => {
            keyboardJS.on(key, _ => {
                app.activeName = tabs[index];
            });
        });
    }

    bindEvents();
}

init();