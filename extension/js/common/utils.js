/**
 * @file utils
 * @author solopea@gmail.com
 */

export const isMac = navigator.appVersion.indexOf('Mac') !== -1

export function renderTemplate(tpl, data) {
    return tpl.replace(/\{\{(\w+)\}\}/g, function (m, $1) {
        return data[$1] || '';
    });
}

export function getTopWin (win) {
    win = win || window;
    if (win.parent === win) {
        return win;
    }
    return getTopWin(win.parent);
}

export function selectText(el) {
    var range = document.createRange();

    range.selectNodeContents(el);

    var sel = window.getSelection();

    sel.removeAllRanges();
    sel.addRange(range);
}

export function getWords() {
    var selection = window.getSelection();
    var frag = selection.getRangeAt(0).cloneContents();

    if (!frag) {
        return;
    }

    var wordElems = frag.querySelectorAll('.mw-highlight');
    var words = [];

    for (var i = 0, len = wordElems.length; i < len; i++) {
        words.push(wordElems[i].textContent);
    }

    return words;
}

export function getParameterByName(name, search = window.location.search) {
    let urlsearch = new URLSearchParams(search);

    return urlsearch.get(name);
}

export const events = {
    on: function(eventType, handle) {
        if (!this.o) {
            this.o = $({});
        }

        if (typeof eventType === 'string') {
            this.o.on.apply(this.o, [
                eventType,
                $.proxy(handle, this)
            ]);

            return this;
        }

        var eventObj;

        if (typeof(eventObj = eventType) === 'object') {
            this.o.on(eventObj);
        }

        return this;
    },

    off: function(eventType) {
        if (!this.o) {
            return;
        }

        var handle = [].slice.apply(arguments, 1);
        if (typeof eventType === 'string' && handle) {
            this.o.off(eventType, handle);
            return this;
        }

        var eventObj;
        if (typeof(eventObj = eventType) === 'object') {
            this.o.off(eventObj);
            return this;
        }

        if (typeof eventType === 'string') {
            this.o.off(eventType);
            return this;
        }

        this.o.off();
    },

    trigger: function() {
        if (!this.o) {
            return;
        }

        this.o.trigger.apply(this.o, arguments);
        return this;
    }
}

export function simTemplate(tpl, data) {
    return tpl.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, function(m, $1) {
        return typeof data[$1] !== 'undefined' ? data[$1] : '';
    });
}

export function getLangCode(lang) {
    if (lang.indexOf('-') !== -1) {
        if (lang.startsWith('zh')) {
            if (lang.toLowerCase === 'zh-tw') {
                return 'zh-TW';
            } else {
                return 'zh-CN';
            }
        } else {
            return lang.split('-')[0];
        }
    } else {
        return lang;
    }
}

export function getRandomOne(list) {
    if (list && list.length) {
        const index = Math.round(Math.random() * (list.length - 1));

        return list[index];
    }
}