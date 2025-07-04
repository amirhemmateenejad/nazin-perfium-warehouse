var blendClientLimits = {
    refs: {
        primary: '#clientLimitNotification',
        form: '#clientLimitNotification form',
        dismiss: '#btnClientLimitNotificationDismiss',
        dontshow: '#btnClientLimitNotificationDontShowAgain',
    },

    init: function() {
        var self = blendClientLimits;

        $(self.refs.form).submit(function(e) {
            e.preventDefault();
            self.go($(this));
        });

        $(self.refs.dismiss).click(function(e) {
            e.preventDefault();
            self.dismiss('clientlimitdismiss');
        });

        $(self.refs.dontshow).click(function(e) {
            e.preventDefault();
            self.dismiss('clientlimitdontshowagain');
        });
    },

    dismiss: function(dismissType) {
        $(this.refs.primary).fadeOut();
        WHMCS.http.jqClient.post(window.location.href, dismissType + '=1&name=' + $(this.refs.primary).find('.panel-title span').html());
    },

    go: function(el) {
        var $fetchUrl = el.data('fetchUrl');
        var $submit = el.find('button[type="submit"]');
        var $submitLabel = $submit.html();
        $submit.css('width', $submit.css('width')).prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
        WHMCS.http.jqClient.post($fetchUrl, el.serialize(),
            function(data) {
                el.find('.input-license-key').val(data.license_key);
                el.find('.input-member-data').val(data.member_data);
                el.off('submit').submit();
                $submit.html($submitLabel).removeProp('disabled');
            }, 'json');
    }
};

$(document).ready(blendClientLimits.init);

var blendGlobal = {
    refs: {
        frmNotes: '#frmMyNotes',
        modalNotes: '#modalMyNotes',
    },

    init: function() {
        var self = blendGlobal;

        // My Notes
        $(self.refs.frmNotes).submit(function(e) {
            e.preventDefault();
            $(self.refs.modalNotes).modal('hide');
            WHMCS.http.jqClient.post(
                $(this).attr('action'),
                $(this).serialize()
            );
        });

        // Modal auto focus on submit or first visible input
        $('div.modal').on('shown.bs.modal', function() {
            var inputs = jQuery(this).find('input:not(input[type=checkbox],' +
                'input[type=radio],input[type=hidden]),button.btn-primary');

            if (inputs.length > 0) {
                $(inputs).first().focus();
            }
        });

        // Init Lightbox2
        lightbox.init();
    }
};

$(document).ready(blendGlobal.init);

var blendIntelliSearch = {
    activeSearch: false,
    typingTimer: null,
    refs: {
        body: 'body',
        form: '#intelliSearchForm',
        value: '#inputIntelliSearchValue',
        close: '#btnIntelliSearchClose',
        results: '#intelligentSearchResults',
        searchResults: '#intelligentSearchResults .search-results',
        resultheadings: '#intelligentSearchResults h5',
        expand: '#intelliSearchExpand',
        realtime: '#intelliSearchRealtime',
        hideinactive: '#intelliSearchHideInactiveSwitch',
        expandbtn: '#intelligentSearchResults .search-more-results',
        searchMoreTpl: '.search-more-results[data-type="placeholder"]',
    },

    init: function() {
        var self = blendIntelliSearch;

        $(self.refs.value).focus(function(e) {
            self.inputExpand();
        });

        $(self.refs.value).keyup(function(){
            self.inputKeyUp();
        });

        $(self.refs.form + ' form').submit(function(e) {
            e.preventDefault();
            self.search();
        });

        $(document).keyup(function(e) {
            if (e.keyCode === 27 && $('#intelliSearchForm').hasClass('active')) {
                self.close();
            }
        });

        $(self.refs.body).click(function(e) {
            if ($(self.refs.form).hasClass('active') && !$(e.target).closest(self.refs.form + ',' + self.refs.results).length) {
                self.close();
            }
        });

        $(self.refs.close).click(function(e) {
            self.close();
        });

        $(self.refs.realtime).bootstrapSwitch()
            .on('switchChange.bootstrapSwitch', function(event, state) {
                WHMCS.http.jqClient.post($(this).data('url'), 'token=' + csrfToken + '&autosearch=' + state);
            });

        $(self.refs.hideinactive).bootstrapSwitch()
            .on('switchChange.bootstrapSwitch', function(event, state) {
                var valueOfField = state ? 1 : 0;
                $('#intelliSearchHideInactive').attr('value', valueOfField);
                self.search();
            });

        $(self.refs.resultheadings).click(function(e) {
            self.toggleResultSet($(this));
        });

        $(blendIntelliSearch.refs.results + ' .collapse-toggle').click(function(e) {
            e.preventDefault();
            blendIntelliSearch.toggleAllResultSets();
        });

        $(document).on('click', blendIntelliSearch.refs.expandbtn, function(e) {
            e.preventDefault();
            blendIntelliSearch.expandResults($(this), $(this).data('type'));
        });
    },
    inputExpand: function() {
        var $form = $(this.refs.form);
        if ($form.data('expanded')) {
            return;
        }

        var $targetOffset = $form.offset();

        var $originalLeft = $targetOffset.left;
        $targetOffset.left -= 100;

        $form
            .data('expanded', true)
            .data('leftpos', $targetOffset.left)
            .css({
                position: 'absolute',
                top: $targetOffset.top,
                left: $originalLeft
            })
            .animate({'left': $targetOffset.left}, 200, function() {
                if ($('#btnNavbarToggle').is(':visible')) {
                    $form.delay(10).queue(function (next) {
                        $(this).addClass('active full-width');
                        next();
                    });
                } else {
                    $form.addClass('active')
                        .css('width', $(window).width() - $targetOffset.left - 5);
                }
            });

        if ($(this.refs.value).val()) {
            $(this.refs.results).slideDown();
        }
    },
    inputKeyUp: function() {
        clearTimeout(this.typingTimer);
        if ($(this.refs.value).val().replace(/\s/g, '').length >= 3 && $('#intelliSearchRealtime').is(':checked')) {
            this.typingTimer = setTimeout(this.search, 750);
        }
    },
    showLoader: function() {
        $(this.refs.form).find('.loader').removeClass('fa-search')
            .addClass('fa-spinner fa-spin');
    },
    endLoader: function() {
        $(this.refs.form).find('.loader').addClass('fa-search')
            .removeClass('fa-spinner fa-spin');
    },
    resetResults: function() {
        $(this.refs.searchResults)
            .find('h5').hide().end()
            .find('ul li:not(.template)').remove().end()
            .find('.search-more-results').remove();
    },
    getResultTypes: function() {
        var types = [];
        $('.search-results ul').each(function(index) {
            types.push($(this).data('type'));
        });
        return types;
    },
    getResultTarget: function(type) {
        return $(this.refs.searchResults + ' ul[data-type="' + type + '"]');
    },
    getNumResults: function(type) {
        return this.getResultTarget(type).find('li:not(.template)').length;
    },
    getTotalResults: function() {
        var $target = $(this.refs.searchResults + ' ul');
        return $target.find('li:not(.template)').length;
    },
    getTemplateByType: function(type) {
        var template = this.getResultTarget(type).find('li.template').clone();
        template.removeClass('template');
        return template;
    },
    renderResults: function(type, data) {
        if (data.length == 0) {
            return;
        }
        var template = this.getTemplateByType(type);
        $.each(data, function(index, result) {
            if (typeof result === 'string') {
                obj = '<li>' + result + '</li>';
            } else {
                var obj = blendIntelliSearch.mergeResultData(template.clone(), result);
            }
            blendIntelliSearch.addResult(type, obj);
        });
        var numResults = this.getNumResults(type);
        this.getResultTarget(type).prev('h5').show().find('.count').html(numResults);
        if (data[0].totalResults > numResults) {
            var remainingResults = data[0].totalResults - numResults;
            this.showExpand(type, remainingResults);
        }
    },
    showExpand: function(type, remainingResults) {
        var showMoreOf = $(this.refs.expand).val();
        if (showMoreOf == type) {
            return;
        }

        cloneRow = $(this.refs.searchMoreTpl).clone();
        cloneRow.attr('data-type', type);
        cloneRow.removeClass('hidden');
        stringValue = cloneRow.html();
        stringValue = stringValue.replace(':count', remainingResults);
        cloneRow.html(stringValue);
        this.addResult(type, cloneRow);
    },
    addResult: function(type, obj) {
        this.getResultTarget(type).append(obj);
    },
    mergeResultData: function(result, data) {
        str = result.html();
        $.each(data, function(key, value) {
            str = str.replace(new RegExp('\\[' + key + '\\]', 'g'), value);
        });
        return result.html(str);
    },
    search: function(expandType) {
        var self = blendIntelliSearch;

        if (self.activeSearch) {
            return;
        }
        self.activeSearch = true;

        self.showLoader();

        if (!$(self.refs.results).is(':visible')) {
            $(self.refs.results).slideDown();
        }

        $(self.refs.expand).val(expandType);
        WHMCS.http.jqClient.jsonPost({
            url: $(self.refs.form + ' form').attr('action'),
            data: $(self.refs.form + ' form').serialize(),
            success: function(results) {
                var showMoreOf = $(self.refs.expand).val();
                if (!showMoreOf) {
                    self.resetResults();
                }

                $.each(self.getResultTypes(), function(index, type) {
                    self.renderResults(type, results[type]);
                });

                self.searchComplete(true);
            },
            warning: function(warningMsg) {
                $(self.refs.results).find('.search-warning')
                    .find('.warning-msg').html(warningMsg);
                self.searchComplete(false, '.search-warning');
            },
            error: function(errorMsg) {
                self.searchComplete(false, '.error');
            },
            fail: function(failMsg) {
                self.searchComplete(false, '.session-expired');
            }
        });
    },
    searchComplete: function(success, revealSelector) {
        if (success) {
            var $numSearchResults = this.getTotalResults();
            $(this.refs.results).find('.search-result-count').html($numSearchResults);
            if ($numSearchResults === 0) {
                revealSelector = '.search-no-results';
            } else {
                revealSelector = '.search-results';
            }
        }

        $(this.refs.results).find('.outcome').not(revealSelector).hide();

        if (!$(this.refs.results).find(revealSelector).is(':visible')) {
            $(this.refs.results).find(revealSelector).fadeIn();
        }

        this.endLoader();

        this.activeSearch = false;
    },
    expandResults: function(target, type) {
        target.remove();
        this.search(type);
    },
    close: function() {
        var $form = $(this.refs.form);
        $(this.refs.results).slideUp();
        $form.css({
            width: '',
            left: $(this.refs.form).data('leftpos')
        }).removeClass('active full-width').delay(100).queue(function (next) {
            $form.css({
                position: '',
                top: '',
                left: ''
            });
            next();
        }).data('expanded', false);
        $('.logo').focus();
        clearTimeout(this.typingTimer);
    },
    toggleResultSet: function(el) {
        var list = el.next('ul');
        if (list.is(':visible')) {
            list.slideUp();
            el.addClass('collapsed');
        } else {
            list.slideDown();
            el.removeClass('collapsed');
        }
        var $visibleCount = $(this.refs.results + ' h5:visible').length;
        var $visibleNotCollapsedCount = $(this.refs.results + ' h5:visible:not(.collapsed)').length;
        var $toggle = $(this.refs.results + ' .collapse-toggle');
        if ($visibleNotCollapsedCount == 0) {
            $toggle.html($toggle.data('lang-expand'));
        } else if ($visibleCount == $visibleNotCollapsedCount) {
            $toggle.html($toggle.data('lang-collapse'));
        }

    },
    toggleAllResultSets: function() {
        var $visibleCount = $(this.refs.results + ' h5:visible:not(.collapsed)').length;
        var $toggle = $(this.refs.results + ' .collapse-toggle');
        if ($visibleCount == 0) {
            $(this.refs.results + ' ul').slideDown();
            $(this.refs.results + ' h5').removeClass('collapsed');
            $toggle.html($toggle.data('lang-collapse'));
        } else {
            $(this.refs.results + ' ul').slideUp();
            $(this.refs.results + ' h5').addClass('collapsed');
            $toggle.html($toggle.data('lang-expand'));
        }
    }
};

$(document).ready(blendIntelliSearch.init);

var blendNav = {
    refs: {
        toggle: '#btnNavbarToggle',
        navbar: '.navigation',
        collapse: '.navigation .navbar-collapse',
        collapseMenuItem: '.navigation .navbar-collapse li.has-dropdown > a',
        collapseMenuListItem: '.navigation .navbar-collapse li.has-dropdown > ul li:not(.expand) > a',
        backdrop: '#nav-backdrop',
    },

    init: function() {
        var self = blendNav;

        $(self.refs.toggle).click(function(e) {
            e.preventDefault();
            self.toggleNavbar();
        });

        $(self.refs.collapseMenuItem).click(function(e) {
            if ($(self.refs.toggle).is(':visible')) {
                e.preventDefault();
                $(this).parent('li').toggleClass('expanded');
            }
        });

        $(self.refs.collapseMenuListItem).click(function() {
            self.toggleNavbar();
        });

        self.fixNavWidths();
    },

    toggleNavbar: function() {
        if ($(this.refs.collapse).is(':visible')) {
            $(this.refs.collapse).hide();
            $(this.refs.backdrop).remove();
            $('html, body').css('overflow', 'auto');
            $(this).removeClass('active');
        } else {
            var $topPosition = $(this.refs.navbar).offset().top + 45;
            $(this.refs.collapse).css({
                top: $topPosition,
                height: $(window).height() - $topPosition
            }).show();
            $(document.createElement('div'))
                .attr('id', 'nav-backdrop')
                .addClass('modal-backdrop nav-modal-backdrop')
                .css('opacity', '0.5')
                .css('position', 'absolute')
                .css('top', $topPosition)
                .appendTo('body');
            $('html, body').css('overflow', 'hidden');
            $(this).addClass('active');
        }
    },

    fixNavWidths: function() {
        if ($(window).width() >= 1260) {
            $(this.refs.collapse + ' > ul > li:not(.bt)').each(function(index) {
                $(this).css('width', $(this).width() + 4);
            });
        }
    }
};

$(document).ready(blendNav.init);

var blendSidebar = {
    refs: {
        sidebar: '#sidebar',
        content: '#contentarea',
        opener: '#sidebarOpener',
        closer: '#sidebarClose',
        collapse: '.sidebar-collapse',
        collapseExpand: '#sidebarCollapseExpand',
    },

    init: function() {
        var self = blendSidebar;

        $(self.refs.opener).click(function(e) {
            e.preventDefault();
            $(this).fadeOut();
            $(self.refs.content).removeClass('sidebar-minimized');
            $(self.refs.sidebar).delay(400).fadeIn('fast');
            WHMCS.http.jqClient.post(whmcsBaseUrl + adminBaseRoutePath + "/search.php","a=maxsidebar");
        });

        $(self.refs.closer).click(function(e) {
            e.preventDefault();
            $(self.refs.sidebar).fadeOut('fast',function(){
                $(self.refs.content).addClass('sidebar-minimized');
                $(self.refs.opener).fadeIn();
            });
            WHMCS.http.jqClient.post(whmcsBaseUrl + adminBaseRoutePath + "/search.php","a=minsidebar");
        });

        $(self.refs.collapseExpand).click(function(e) {
            e.preventDefault();
            $(this).toggleClass('expanded');
            $(self.refs.collapse).slideToggle();
        });
    }
};

$(document).ready(blendSidebar.init);

var blendSlidetray = {
    refs: {
        opener: '*[data-toggle="slide-tray"]',
        close: 'button[data-dismiss="slide-tray"]',
        backdrop: 'slide-tray-backdrop',
        tray: '.slide-tray',
    },

    init: function() {
        var self = blendSlidetray;

        $(self.refs.opener).click(function(e) {
            e.preventDefault();
            var $target = $(this).data('target');
            if (!$('#' + self.refs.backdrop).length) {
                $(document.createElement('div'))
                    .attr('id', self.refs.backdrop)
                    .addClass('modal-backdrop nav-modal-backdrop')
                    .css('opacity', '0.5')
                    .css('position', 'absolute')
                    .css('top', 0)
                    .appendTo('body');
            }
            $('#' + self.refs.backdrop).fadeIn();
            $('html, body').css('overflow', 'hidden');
            $($target).show();
            if ($($target).hasClass('right')) {
                $($target).css('right', $($target).outerWidth() * -1);
                $($target).animate({ right: 0 }, 200);
            } else {
                $($target).css('left', $($target).outerWidth() * -1);
                $($target).animate({ left: 0 }, 200);
            }
        });

        $(self.refs.close).click(function(e) {
            e.preventDefault();
            var $target = $(this).closest(self.refs.tray);
            if ($($target).hasClass('right')) {
                $($target).animate({ right: $($target).outerWidth() * -1 }, 200, function() {
                    $($target).hide();
                    $('#' + self.refs.backdrop).fadeOut('', function() {
                        $('html, body').css('overflow', 'auto');
                    });
                });
            } else {
                $($target).animate({ left: $($target).outerWidth() * -1 }, 200, function() {
                    $($target).hide();
                    $('#' + self.refs.backdrop).fadeOut('', function() {
                        $('html, body').css('overflow', 'auto');
                    });
                });
            }
        });
    }
};

$(document).ready(blendSlidetray.init);

function toggleadvsearch() {
    if (document.getElementById('searchbox').style.visibility=="hidden") {
        document.getElementById('searchbox').style.visibility="";
    } else {
        document.getElementById('searchbox').style.visibility="hidden";
    }
}

function populate(o) {
  d=document.getElementById('searchfield');
  v=o.options[o.selectedIndex].value;
  if(!d){return;}            
  var mitems=new Array();
  mitems['clients']=['Client ID','Client Name','Company Name','Email Address','Address 1','Address 2','City','State','Postcode','Country','Phone Number','CC Last Four','Notes'];
  mitems['orders']=['Order ID','Order #','Client Name','Order Date','Amount'];
  mitems['services']=['Service ID','Domain','Client Name','Product','Billing Cycle','Next Due Date','Status','Username','Dedicated IP','Assigned IPs','Subscription ID','Notes'];
  mitems['domains']=['Domain ID','Domain','Client Name','Registrar','Expiry Date','Status','Subscription ID','Notes'];
  mitems['invoices']=['Invoice #','Client Name','Line Item','Invoice Date','Due Date','Date Paid','Total Due','Status'];
  mitems['tickets']=['Ticket #','Tag','Subject','Client Name','Email Address'];
  d.options.length=0;
  cur=mitems[o.options[o.selectedIndex].value];
  if(!cur){return;}
  d.options.length=cur.length;
  for(var i=0;i<cur.length;i++) {
    d.options[i].text=cur[i];
    d.options[i].value=cur[i];
  }
  if(v == 'services' || v == 'domains' || v == "clients") { 
    document.getElementById('searchfield').selectedIndex = 1;
  }
}
/**
 * WHMCS core JS library reference
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2017
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */

(function (window, factory) {
    if (typeof window.WHMCS !== 'object') {
        window.WHMCS = factory;
    }
}(
    window,
    {
        hasModule: function (name) {
            return (typeof WHMCS[name] !== 'undefined'
                && Object.getOwnPropertyNames(WHMCS[name]).length > 0);
        },
        loadModule: function (name, module) {
            if (this.hasModule(name)) {
                return;
            }

            WHMCS[name] = {};
            if (typeof module === 'function') {
                (module).apply(WHMCS[name]);
            } else {
                for (var key in module) {
                    if (module.hasOwnProperty(key)) {
                        WHMCS[name][key] = {};
                        (module[key]).apply(WHMCS[name][key]);
                    }
                }
            }
        }
    }
));

jQuery(document).ready(function() {
    jQuery(document).on('click', '.disable-on-click', function () {
        jQuery(this).addClass('disabled');

        if (jQuery(this).hasClass('spinner-on-click')) {
            var icon = $(this).find('i.fas,i.far,i.fal,i.fab');

            jQuery(icon)
                .removeAttr('class')
                .addClass('fas fa-spinner fa-spin');
        }
    })
    .on('click', '#openTicketSubmit.disabled', function () {
        return false;
    });
});

function scrollToGatewayInputError() {
    var displayError = jQuery('.gateway-errors,.assisted-cc-input-feedback').first(),
        frm = displayError.closest('form');
    if (!frm) {
        frm = jQuery('form').first();
    }
    frm.find('button[type="submit"],input[type="submit"]')
        .prop('disabled', false)
        .removeClass('disabled')
        .find('i.fas,i.far,i.fal,i.fab')
        .removeAttr('class')
        .addClass('fas fa-arrow-circle-right')
        .find('span').toggle();

    if (displayError.length) {
        if (elementOutOfViewPort(displayError[0])) {
            jQuery('html, body').animate(
                {
                    scrollTop: displayError.offset().top - 50
                },
                500
            );
        }
    }
}

function elementOutOfViewPort(element) {
    // Get element's bounding
    var bounding = element.getBoundingClientRect();
    // Check if it's out of the viewport on each side
    var out = {};
    out.top = bounding.top < 0;
    out.left = bounding.left < 0;
    out.bottom = bounding.bottom > (window.innerHeight || document.documentElement.clientHeight);
    out.right = bounding.right > (window.innerWidth || document.documentElement.clientWidth);
    out.any = out.top || out.left || out.bottom || out.right;

    return out.any;
};

/**
 * General utilities module
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2017
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */
(function(module) {
    if (!WHMCS.hasModule('adminUtils')) {
        WHMCS.loadModule('adminUtils', module);
    }
})(
function () {
    this.getAdminRouteUrl = function (path) {
        return whmcsBaseUrl + "/index.php?rp=" + adminBaseRoutePath + path;
    };

    this.normaliseStringValue = function(status) {
        return status ? status.toLowerCase().replace(/\s/g, '-') : '';
    }

    this.generatePassword = function(len) {
        var charset = this.getPasswordCharacterSet();
        var result = "";
        for (var i = 0; len > i; i++)
            result += charset[this.randomInt(charset.length)];
        return result;
    };
    this.getPasswordCharacterSet = function() {
        var rawCharset = '0123456789'
            + 'abcdefghijklmnopqrstuvwxyz'
            + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            + '!#$%()*+,-.:;=@_|{ldelim}{rdelim}~';

        // Parse UTF-16, remove duplicates, convert to array of strings
        var charset = [];
        for (var i = 0; rawCharset.length > i; i++) {
            var c = rawCharset.charCodeAt(i);
            if (0xD800 > c || c >= 0xE000) {  // Regular UTF-16 character
                var s = rawCharset.charAt(i);
                if (charset.indexOf(s) == -1)
                    charset.push(s);
                continue;
            }
            if (0xDC00 > c ? rawCharset.length > i + 1 : false) {  // High surrogate
                var d = rawCharset.charCodeAt(i + 1);
                if (d >= 0xDC00 ? 0xE000 > d : false) {  // Low surrogate
                    var s = rawCharset.substring(i, i + 2);
                    i++;
                    if (charset.indexOf(s) == -1)
                        charset.push(s);
                    continue;
                }
            }
            throw new Error("Invalid UTF-16");
        }
        return charset;
    };
    this.randomInt = function(n) {
        var x = this.randomIntMathRandom(n);
        x = (x + this.randomIntBrowserCrypto(n)) % n;
        return x;
    };
    this.randomIntMathRandom = function(n) {
        var x = Math.floor(Math.random() * n);
        if (0 > x || x >= n)
            throw new Error("Arithmetic exception");
        return x;
    };
    this.randomIntBrowserCrypto = function(n) {
        var cryptoObject = null;

        if ("crypto" in window)
            cryptoObject = crypto;
        else if ("msCrypto" in window)
            cryptoObject = msCrypto;
        else
            return 0;

        if (!("getRandomValues" in cryptoObject) || !("Uint32Array" in window) || typeof Uint32Array != "function")
            cryptoObject = null;

        if (cryptoObject == null)
            return 0;

        // Generate an unbiased sample
        var x = new Uint32Array(1);
        do cryptoObject.getRandomValues(x);
        while (x[0] - x[0] % n > 4294967296 - n);
        return x[0] % n;
    };

    return this;
});

/**
 * WHMCS HTTP module
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2018
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */
(function(module) {
    if (!WHMCS.hasModule('http')) {
        WHMCS.loadModule('http', module);
    }
})({
jqClient: function () {
    _getSettings = function (url, data, success, dataType)
    {
        if (typeof url === 'object') {
            /*
                Settings may be the only argument
             */
            return url;
        }

        if (typeof data === 'function') {
            /*
                If 'data' is omitted, 'success' will come in its place
             */
            success = data;
            data = null;
        }

        return {
            url: url,
            data: data,
            success: success,
            dataType: dataType
        };
    };

    /**
     * @param url
     * @param data
     * @param success
     * @param dataType
     * @returns {*}
     */
    this.get = function (url, data, success, dataType)
    {
        return WHMCS.http.client.request(
            jQuery.extend(
                _getSettings(url, data, success, dataType),
                {
                    type: 'GET'
                }
            )
        );
    };

    /**
     * @param url
     * @param data
     * @param success
     * @param dataType
     * @returns {*}
     */
    this.post = function (url, data, success, dataType)
    {
        return WHMCS.http.client.request(
            jQuery.extend(
                _getSettings(url, data, success, dataType),
                {
                    type: 'POST'
                }
            )
        );
    };

    /**
     * @param options
     * @returns {*}
     */
    this.jsonGet = function (options) {
        options = options || {};
        this.get(options.url, options.data, function(response) {
            if (response.warning) {
                console.log('[WHMCS] Warning: ' + response.warning);
                if (typeof options.warning === 'function') {
                    options.warning(response.warning);
                }
            } else if (response.error) {
                console.log('[WHMCS] Error: ' + response.error);
                if (typeof options.error === 'function') {
                    options.error(response.error);
                }
            } else {
                if (typeof options.success === 'function') {
                    options.success(response);
                }
            }
        }, 'json').error(function(xhr, errorMsg){
            console.log('[WHMCS] Error: ' + errorMsg);
            if (typeof options.fail === 'function') {
                options.fail(errorMsg);
            }
        }).always(function() {
            if (typeof options.always === 'function') {
                options.always();
            }
        });
    };

    /**
     * @param options
     * @returns {*}
     */
    this.jsonPost = function (options) {
        options = options || {};
        this.post(options.url, options.data, function(jsonResponse, httpStatusText, jqXHR) {
            if (jsonResponse.warning) {
                console.log('[WHMCS] Warning: ' + jsonResponse.warning);
                if (typeof options.warning === 'function') {
                    options.warning(jsonResponse.warning, jsonResponse, jqXHR);
                }
            } else if (jsonResponse.error) {
                console.log('[WHMCS] Error: ' + jsonResponse.error);
                if (typeof options.error === 'function') {
                    options.error(jsonResponse.error, jsonResponse, jqXHR);
                }
            } else if (typeof options.success === 'function') {
                options.success(jsonResponse, jqXHR);
            }
        }, 'json')
        .fail(function(jqXHR, jqResponseType, httpStatusText){
            console.log('[WHMCS] Fail: ' + jqResponseType);
            if (typeof options.fail === 'function') {
                options.fail(jqResponseType, jqXHR.responseJSON, jqXHR);
            }
        })
        .always(function(jqXHR, jqResponseType, httpStatusText) {
            if (typeof options.always === 'function') {
                options.always(jqXHR);
            }
        });
    };

    return this;
},

client: function () {
    var methods = ['get', 'post', 'put', 'delete'];
    var client = this;

    _beforeRequest = function (settings)
    {
        /*
            Enforcing dataType was found to break many invocations expecting HTML back.
            If/when those are refactored, this may be uncommented to enforce a safer
            data transit.
         */
        /*if (typeof settings.dataType === 'undefined') {
            settings.dataType = 'json';
        }*/

        if (typeof settings.type === 'undefined') {
            // default request type is GET
            settings.type = 'GET';
        }

        /*
            Add other preprocessing here if required
         */

        return settings;
    };

    this.request = function (settings)
    {
        settings = _beforeRequest(settings || {});
        return jQuery.ajax(settings);
    };

    /*
        Create shortcut methods for methods[] array above
     */
    jQuery.each(methods, function(index, method) {
        client[method] = (function(method, client) {
            return function (settings)
            {
                settings = settings || {};

                settings.type = method.toUpperCase();

                return client.request(settings);
            }
        })(method, client);
    });

    return this;
}

});

/**
 * WHMCS UI module
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2017
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */
(function(module) {
    if (!WHMCS.hasModule('ui')) {
        WHMCS.loadModule('ui', module);
    }
})({
/**
 * Confirmation PopUp
 */
confirmation: function () {

    /**
     * @type {Array} Registered confirmation root selectors
     */
    var toggles = [];

    /**
     * Register/Re-Register all confirmation elements with jQuery
     * By default all elements of data toggle "confirmation" will be registered
     *
     * @param {(string|undefined)} rootSelector
     * @return {Array} array of registered toggles
     */
    this.register = function (rootSelector) {
        if (typeof rootSelector === 'undefined') {
            rootSelector = '[data-toggle=confirmation]';
        }
        if (toggles.indexOf(rootSelector) < 0) {
            toggles.push(rootSelector);
        }

        jQuery(rootSelector).confirmation({
            rootSelector: rootSelector
        });

        return toggles;
    };

    return this;
},

/**
 * Data Driven Table
 */
dataTable: function () {

    /**
     * @type {{}}
     */
    this.tables = {};

    /**
     * Register all tables on page with the class "data-driven"
     */
    this.register = function () {
        var self = this;
        jQuery('table.data-driven').each(function (i, table) {
            self.getTableById(table.id, undefined);
        });
    };

    /**
     * Get a table by id; create table object on fly as necessary
     *
     * @param {string} id
     * @param {({}|undefined)} options
     * @returns {DataTable}
     */
    this.getTableById = function (id, options) {
        var self = this;
        var el = jQuery('#' + id);
        if (typeof self.tables[id] === 'undefined') {
            if (typeof options === 'undefined') {
                options = {
                    dom: '<"listtable"ift>pl',
                    paging: false,
                    lengthChange: false,
                    searching: false,
                    ordering: true,
                    info: false,
                    autoWidth: true,
                    columns: [],
                    lengthMenu: [10, 25, 50, 100, 500, 1000],
                    language: {
                        emptyTable: (el.data('langEmptyTable')) ? el.data('langEmptyTable') : "No records found"
                    }
                };
            }
            jQuery.each(el.data(), function (key, value) {
                if (typeof value === 'undefined') {
                    return;
                }
                if (key === 'ajaxUrl') {
                    options.ajax = {
                        url: value
                    };
                    return;
                }
                if (key === 'lengthChange') {
                    options.lengthChange = value;
                    return;
                }
                if (key === 'pageLength') {
                    options.pageLength = value;
                    return;
                }
                if (key === 'langEmptyTable') {
                    if (typeof options.language === "undefined") {
                        options.language = {};
                    }
                    options.language.emptyTable = value;
                    return
                }
                if (key === 'langZeroRecords') {
                    if (typeof options.language === "undefined") {
                        options.language = {};
                    }
                    options.language.zeroRecords = value;
                    return
                }
                options.key = value;
            });
            jQuery.each(el.find('th'), function() {
                if (typeof options.columns === "undefined") {
                    options.columns = [];
                }
                options.columns.push({data:jQuery(this).data('name')});
            });
            self.tables[id] = self.initTable(el, options);
        } else if (typeof options !== 'undefined') {
            var oldTable = self.tables[id];
            var initOpts = oldTable.init();
            var newOpts = jQuery.extend( initOpts, options);
            oldTable.destroy();
            self.tables[id] = self.initTable(el, newOpts);
        }

        return self.tables[id];
    };

    this.initTable = function (el, options) {
        var table = el.DataTable(options);
        var self = this;
        if (el.data('on-draw')) {
            table.on('draw.dt', function (e, settings) {
                var namedCallback = el.data('on-draw');
                if (typeof window[namedCallback] === 'function') {
                    window[namedCallback](e, settings);
                }
            });
        } else if (el.data('on-draw-rebind-confirmation')) {
            table.on('draw.dt', function (e) {
                self.rebindConfirmation(e);
            });
        }

        return table;
    };

    this.rebindConfirmation = function (e) {
        var self = this;
        var tableId = e.target.id;
        var toggles = WHMCS.ui.confirmation.register();
        for(var i = 0, len = toggles.length; i < len; i++ ) {
            jQuery(toggles[i]).on(
                'confirmed.bs.confirmation',
                function (e)
                {
                    e.preventDefault();
                    WHMCS.http.jqClient.post(
                        jQuery(e.target).data('target-url'),
                        {
                            'token': csrfToken
                        }
                    ).done(function (data)
                    {
                        if (data.status === 'success' || data.status === 'okay') {
                            self.getTableById(tableId, undefined).ajax.reload();
                        }
                    });

                }
            );
        }
    };

    return this;
},

clipboard: function() {
    this.copy = function(e) {
        e.preventDefault();

        var trigger = $(e.currentTarget);
        var contentElement = $(trigger).data('clipboard-target');
        var container = $(contentElement).parent();

        try {
            var tempElement = $('<textarea>')
                .css('position', 'fixed')
                .css('opacity', '0')
                .css('width', '1px')
                .css('height', '1px')
                .val($(contentElement).val());

            container.append(tempElement);
            tempElement.focus().select();
            document.execCommand('copy');
        } finally {
            tempElement.remove();
        }

        trigger.tooltip({
            trigger: 'click',
            placement: 'bottom'
        });
        WHMCS.ui.toolTip.setTip(trigger, 'Copied!');
        WHMCS.ui.toolTip.hideTip(trigger);
    };

    return this;
},

/**
 * ToolTip and Clipboard behaviors
 */
toolTip: function () {
    this.setTip = function (btn, message) {
        var tip = btn.data('bs.tooltip');
        if (tip.hoverState !== 'in') {
            tip.hoverState = 'in';
        }
        btn.attr('data-original-title', message);
        tip.show();

        return tip;
    };

    this.hideTip = function (btn, timeout) {
        if (!timeout) {
            timeout = 2000;
        }
        return setTimeout(function() {
            btn.data('bs.tooltip').hide()
        }, timeout);
    }
},

jsonForm: function() {
    this.managedElements = 'input,textarea,select';

    this.initFields = function (form) {
        var self = this;
        $(form).find(self.managedElements).each(function () {
            var field = this;

            $(field).on('keypress change', function () {
                if (self.fieldHasError(field)) {
                    self.clearFieldError(field);
                }
            });
        });
    };

    this.init = function (form) {
        var self = this;

        self.initFields(form);

        $(form).on('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();

            self.clearErrors(form);

            var formModal = $(form).parents('.modal[role="dialog"]').first();

            if ($(formModal).length) {
                $(formModal).on('show.bs.modal hidden.bs.modal', function() {
                    self.clearErrors(form);
                });

                /*
                 * Make this optional if the form is used for editing
                 */
                $(formModal).on('show.bs.modal', function() {
                    $(form)[0].reset();
                });
            }

            WHMCS.http.client.post({
                url: $(form).attr('action'),
                data: $(form).serializeArray(),
            })
                .done(function (response) {
                    self.onSuccess(form, response);
                })
                .fail(function (jqXHR) {
                    self.onError(form, jqXHR);
                })
                .always(function (data) {
                    self.onRequestComplete(form, data);
                });
        });
    };

    this.initAll = function () {
        var self = this;

        $('form[data-role="json-form"]').each(function() {
            var formElement = this;
            self.init(formElement);
        });
    };

    this.markFieldErrors = function (form, fields)
    {
        var self = this;
        var errorMessage = null;
        var field, fieldLookup;

        for (var fieldName in fields) {
            if (fields.hasOwnProperty(fieldName)) {
                errorMessage = fields[fieldName];
            }

            fieldLookup = self.managedElements.split(',').map(function(element) {
                return element + '[name="' + fieldName + '"]';
            }).join(',');

            field = $(form).find(fieldLookup);

            if (errorMessage) {
                $(field).parents('.form-group').addClass('has-error');
                $(field).attr('title', errorMessage);
                $(field).tooltip();
            }
        }

        $(form).find('.form-group.has-error input[title]').first().tooltip('show');
    };

    this.fieldHasError = function (field) {
        return $(field).parents('.form-group').hasClass('has-error');
    };

    this.clearFieldError = function (field) {
        /**
         * Try dispose first for BS 4, which will raise error
         * on BS 3 or older, then we use destroy instead
         */
        try {
            $(field).tooltip('dispose');
        } catch (err) {
            $(field).tooltip('destroy');
        }
        $(field).parents('.form-group').removeClass('has-error');
    };

    this.onSuccess = function (form, response) {
        var formOnSuccess = $(form).data('on-success');

        if (typeof formOnSuccess === 'function') {
            formOnSuccess(response.data);
        }
    };

    this.onError = function (form, jqXHR) {
        if (jqXHR.responseJSON && jqXHR.responseJSON.fields && typeof jqXHR.responseJSON.fields === 'object') {
            this.markFieldErrors(form, jqXHR.responseJSON.fields);
        } else {
            // TODO: replace with client-accessible generic error messaging
            console.log('Unknown error - please try again later.');
        }

        var formOnError = $(form).data('on-error');

        if (typeof formOnError === 'function') {
            formOnError(jqXHR);
        }
    };

    this.clearErrors = function (form) {
        var self = this;

        $(form).find(self.managedElements).each(function () {
            self.clearFieldError(this);
        })
    };

    this.onRequestComplete = function (form, data) {
        // implement as needed
    };

    return this;
},

effects: function () {
    this.errorShake = function (element) {
        /**
         * Shake effect without jQuery UI inspired by Hiren Patel | ninty9notout:
         * @see https://github.com/ninty9notout/jquery-shake/blob/51f3dcf625970c78505bcac831fd9e28fc85d374/jquery.ui.shake.js
         */
        options = options || {};
        var options = $.extend({
            direction: "left",
            distance: 8,
            times: 3,
            speed: 90
        }, options);

        return element.each(function () {
            var el = $(this), props = {
                position: el.css("position"),
                top: el.css("top"),
                bottom: el.css("bottom"),
                left: el.css("left"),
                right: el.css("right")
            };

            el.css("position", "relative");

            var ref = (options.direction === "up" || options.direction === "down") ? "top" : "left";
            var motion = (options.direction === "up" || options.direction === "left") ? "pos" : "neg";

            var animation = {}, animation1 = {}, animation2 = {};
            animation[ref] = (motion === "pos" ? "-=" : "+=") + options.distance;
            animation1[ref] = (motion === "pos" ? "+=" : "-=") + options.distance * 2;
            animation2[ref] = (motion === "pos" ? "-=" : "+=") + options.distance * 2;

            el.animate(animation, options.speed);
            for (var i = 1; i < options.times; i++) {
                el.animate(animation1, options.speed).animate(animation2, options.speed);
            }

            el.animate(animation1, options.speed).animate(animation, options.speed / 2, function () {
                el.css(props);
            });
        });
    };

}
});

/**
 * Form module
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2017
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */
(function(module) {
    if (!WHMCS.hasModule('form')) {
        WHMCS.loadModule('form', module);
    }
})(
function () {
    this.checkAllBound = false;

    this.register = function () {
        if (!this.checkAllBound) {
            this.bindCheckAll();
            this.checkAllBound = true;
        }
    };

    this.bindCheckAll = function ()
    {
        var huntSelector = '.btn-check-all';
        jQuery('body').on('click', huntSelector, function (e) {
            var btn = jQuery(e.target);
            var targetInputs = jQuery(
                '#' + btn.data('checkbox-container') + ' input[type="checkbox"]'
            );
            if (btn.data('btn-check-toggle')) {
                // one control that changes
                var textDeselect = 'Deselect All';
                var textSelect = 'Select All';
                if (btn.data('label-text-deselect')) {
                    textDeselect = btn.data('label-text-deselect');
                }
                if (btn.data('label-text-select')) {
                    textSelect = btn.data('label-text-select');
                }

                if (btn.hasClass('toggle-active')) {
                    targetInputs.prop('checked',false);
                    btn.text(textSelect);
                    btn.removeClass('toggle-active');
                } else {
                    targetInputs.prop('checked',true);
                    btn.text(textDeselect);
                    btn.addClass('toggle-active');
                }
            } else {
                // two controls that are static
                if (btn.data('btn-toggle-on')) {
                    targetInputs.prop('checked',true);
                } else {
                    targetInputs.prop('checked',false);
                }
            }
        });
    };

    this.reloadCaptcha = function (element)
    {
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
        } else {
            if (!element) {
                element = jQuery('#inputCaptchaImage');
            }

            var src = jQuery(element).data('src');
            jQuery(element).attr('src', src + '?nocache=' + (new Date()).getTime());

            var userInput = jQuery('#inputCaptcha');
            if (userInput.length) {
                userInput.val('');
            }
        }
    };

    return this;
});

/**
 * Selectize module
 *
 * Most basic usage:
 *  `WHMCS.selectize.register('#mySelect');`
 *    - This will selectize the <select id="mySelect"></select>.  See
 *      .register() for more specifics.
 *
 * Pre-made usage:
 *  `WHMCS.selectize.clientSearch();`
 *    - selectize all '.selectize-client-search'
 *
 *  `WHMCS.selectize.users(selector, options)`
 *    - selectize a given selector with a static array of options (user objects)
 *
 */
(function(module) {
    if (!WHMCS.hasModule('selectize')) {
        WHMCS.loadModule('selectize', module);
    }
})(
function () {
    /**
     * Applying fix
     * Selectize dropdown selection outside modal window causes the modal to close
     * Bug occurs only when same option is being selected twice
     * Long known bug https://github.com/selectize/selectize.js/issues/1689
     * Solution is taken from https://github.com/selectize/selectize.js/pull/1813
     */
    $(document).ready(function () {
        const originalSetup = Selectize.prototype.setup;
        Selectize.prototype.setup = function () {
            originalSetup.apply(this, arguments);
            const self = this;

            this.$dropdown.off('mousedown', '[data-selectable]')
            this.$dropdown.on('mouseup', '[data-selectable]', function() {
                return self.onOptionSelect.apply(self, arguments);
            });

            this.$control.off('mousedown', '*:not(input)');
            this.$control.on('mouseup', '*:not(input)', function(e) {
                let child = e.target;
                while (child && child.parentNode !== self.$control[0]) {
                    child = child.parentNode;
                }
                e.currentTarget = child;
                return self.onItemSelect.apply(self, arguments);
            });

            this.$control_input.off('blur');

            $(document).off('mousedown' + this.eventNS);
            $(document).on('mousedown' + this.eventNS, function(e) {
                if (self.isFocused) {
                    if ((e.target === self.$dropdown[0]) || (e.target.parentNode === self.$dropdown[0])) {
                        return false;
                    }
                    if ((!self.$dropdown.has(e.target).length) && (e.target !== self.$control[0])) {
                        self.blur(e.target);
                    }
                }
            });
        }
    });

    /**
     * Search-on-type client select & click "#goButton" on 'change' event
     * - will bind to <select> with '.selectize-client-search'
     * - <select> needs data-search-url attribute for 'load' event
     *
     * @returns {Selectize}
     */
    this.clientSearch = function () {
        var itemDecorator = function(item, escape) {
            if (typeof dropdownSelectClient === "function") {
                if (jQuery(".selectize-dropdown-content > div").length === 0) {
                    // updates DOM for admin/supporttickets.php
                    dropdownSelectClient(
                        escape(item.id),
                        escape(item.name)
                        + (item.companyname ? ' (' + escape(item.companyname) + ')' : '')
                        + (item.id > 0 ? ' - #' + escape(item.id) : ''),
                        escape(item.email)
                    );
                }
            }
            return '<div class="client-name"><span class="name">' + escape(item.name) +
                (item.companyname ? ' (' + escape(item.companyname) + ')' : '')  +
                (item.id > 0 ? ' - #' + escape(item.id) : '') + '</span></div>';
        };

        var selector ='.selectize-client-search';
        var selectElement = jQuery(selector);

        var module = this;
        var selectized = [];
        selectElement.each(function (){
            var element = $(this);
            var configuration = {
                'valueField': element.data('value-field'),
                allowEmptyOption: (element.data('allow-empty-option') === 1),
                'labelField': 'name', //legacy? shouldn't be required with render
                'render': {
                    item: itemDecorator
                },
                optgroupField: 'status',
                optgroupLabelField: 'name',
                optgroupValueField: 'id',
                optgroups: [
                    {$order: 1, id: 'active', name: element.data('active-label')},
                    {$order: 2, id: 'inactive', name: element.data('inactive-label')}
                ],
                'load': module.builder.onLoadEvent(
                    element.data('search-url'),
                    function (query) {
                        return {
                            dropdownsearchq: query,
                            clientId: instance.currentValue,
                            showNoneOption: (element.data('allow-empty-option') === 1),
                        };
                    }
                ),
                'onChange': function(value) {
                    // Updates DOM for admin/supporttickets.php
                    if (value && typeof dropdownSelectClient === 'function') {
                        value = parseInt(value);
                        var newSelection = jQuery(".selectize-dropdown-content div[data-value|='" + value + "']");
                        dropdownSelectClient(
                            value,
                            newSelection.children("span.name").text(),
                            newSelection.children("span.email").text()
                        );
                    }
                }
            };

            var instance = module.clients(element, undefined, configuration);

            instance.on('change', module.builder.onChangeEvent(instance, '#goButton'));

            return selectized.push(instance);
        });

        if (selectized.length > 1) {
            return selectized;
        }

        return selectized[0];

    };

    this.userSearch = function () {
        var itemDecorator = function(item, escape) {
            var idAppend = '',
                isNumeric = !isNaN(item.id);

            if (isNumeric && item.id > 0) {
                idAppend = ' - #' + escape(item.id);
            }
            return '<div><span class="name">' + escape(item.name) + idAppend + '</span></div>';
        };

        var selector ='.selectize-user-search';
        var selectElement = jQuery(selector);

        var module = this;
        var selectized = [];
        selectElement.each(function (){
            var element = $(this);
            var configuration = {
                'valueField': element.data('value-field'),
                'labelField': 'name',
                'render': {
                    item: itemDecorator
                },
                'preload': false,
                'load': module.builder.onLoadEvent(
                    element.data('search-url'),
                    function (query) {
                        return {
                            token: csrfToken,
                            search: query
                        };
                    }
                )
            };

            var instance = module.users(selector, undefined, configuration);

            return selectized.push(instance);
        });

        if (selectized.length > 1) {
            return selectized;
        }

        return selectized[0];

    };

    this.serviceSearch = function () {
        var itemDecorator = function(item) {
            var newDiv = $('<div>');
            if (item.color) {
                newDiv.css('background-color', item.color);
            }
            newDiv.append(
                $('<span>').attr('class', 'name').text(item.name)
            )
            return newDiv;
        };

        var selector ='.selectize-service-search';
        var selectElement = jQuery(selector);

        var module = this;
        var selectized = [];
        selectElement.each(function (){
            var element = $(this);
            var configuration = {
                'valueField': 'id',
                'labelField': 'name',
                'render': {
                    item: itemDecorator
                },
                'preload': true,
                'load': module.builder.onLoadEvent(
                    element.data('search-url'),
                    function (query) {
                        return {
                            token: csrfToken,
                            search: query
                        };
                    }
                )
            };

            var instance = module.services(selector, undefined, configuration);

            return selectized.push(instance);
        });

        if (selectized.length > 1) {
            return selectized;
        }

        return selectized[0];
    };

    this.productSearch = function() {
        var selector = '.selectize-product-search',
            selectElement = jQuery(selector),
            module = this,
            selectized = [],
            itemDecorator = function(data, escape) {
                var newDiv = jQuery('<div>'),
                    newSpan = jQuery('<span>').attr('class', 'name').text(escape(data.name));
                newDiv.append(newSpan);
                return newDiv;
            };

        selectElement.each(function() {
            var element = jQuery(this),
                configuration = {
                    'valueField': 'id',
                    'labelField': 'name',
                    'render': {
                        item: itemDecorator
                    },
                    optgroupField: 'groupid',
                    optgroupLabelField: 'name',
                    optgroupValueField: 'id',
                    'preload': true,
                    'load': module.builder.onLoadEvent(
                        element.data('search-url'),
                        function (query) {
                            return {
                                token: csrfToken,
                                search: query,
                            };
                        }
                    ),
                    'onLoad': function(data) {
                        var instance = this,
                            listItems = jQuery('.product-recommendations-wrapper li');
                        data.forEach(function(item) {
                            if (listItems.find('input[value="' + item.id + '"]').length) {
                                instance.removeOption(item.id);
                                return;
                            }
                            instance.addOptionGroup(item.groupid, {
                                $order: item.order,
                                name: item.group,
                            });
                        });
                    },
                    'onBlur': function() {
                        this.clear();
                    },
                    'onItemAdd': function(value) {
                        var listItems = jQuery('.product-recommendations-wrapper li'),
                            existingItems = listItems.find('input[value="' + value + '"]').length,
                            recommendationAlert = jQuery('div.recommendation-alert'),
                            isChanged = false;
                        if (value && existingItems < 1) {
                            var newSelection = jQuery(".selectize-dropdown-content div[data-value|='" + value + "']"),
                                clonableItem = jQuery('.product-recommendations-wrapper .clonable-item'),
                                parentList = clonableItem.closest('ul'),
                                clonedItem = clonableItem.clone().removeClass('hidden clonable-item');
                            clonedItem.find('a span.recommendation-name').text(
                                newSelection.siblings('div.optgroup-header').text() +
                                ' - ' +
                                newSelection.children("span.name").text()
                            );
                            jQuery('<input>').attr({
                                type: 'hidden',
                                name: 'productRecommendations[]',
                                value: value
                            }).appendTo(clonedItem);
                            clonedItem.find('input').val(value);
                            clonedItem.appendTo(parentList);
                            instance.removeOption(value);
                            isChanged = true;
                        }
                        if (listItems.length > 0) {
                            jQuery('.product-recommendations-wrapper .placeholder-list-item').addClass('hidden');
                            isChanged = true;
                        }
                        if (isChanged && recommendationAlert.not(':visible')) {
                            jQuery('.recommendation-alert').removeClass('hidden');
                        }
                    }
                },
                instance = module.products(selector, undefined, configuration);

            return selectized.push(instance);
        });

        if (selectized.length > 1) {
            return selectized;
        }

        return selectized[0];
    };

    /**
     * Generic selectize of users
     *  - no 'change' or 'load' events
     *
     * @param selector
     * @param options
     * @param configuration
     * @returns {Selectize}
     */
    this.clients = function (selector, options, configuration) {
        var instance = this.register(
            selector,
            options,
            WHMCS.selectize.optionDecorator.client,
            configuration
        );

        instance.settings.searchField = ['name', 'email', 'companyname'];

        return instance;
    };

    this.users = function (selector, options, configuration) {
        var instance = this.register(
            selector,
            options,
            WHMCS.selectize.optionDecorator.user,
            configuration
        );

        instance.settings.searchField = ['name', 'email'];

        return instance;
    };

    this.services = function (selector, options, configuration) {
        var instance = this.register(
            selector,
            options,
            WHMCS.selectize.optionDecorator.service,
            configuration
        );

        instance.settings.searchField = ['name', 'noResults'];

        return instance;
    };

    this.billingContacts = function (selector, options, configuration) {
        var instance = this.register(
            selector,
            options,
            WHMCS.selectize.optionDecorator.billingContact,
            configuration
        );

        instance.settings.searchField = ['name', 'email', 'companyname', 'address'];

        return instance;
    };

    this.payMethods = function (selector, options, configuration) {
        var instance = this.register(
            selector,
            options,
            WHMCS.selectize.optionDecorator.payMethod,
            configuration
        );

        instance.settings.searchField = ['description', 'shortAccountNumber', 'type', 'payMethodType'];

        return instance;
    };

    this.products = function (selector, options, configuration) {
        var instance = this.register(
            selector,
            options,
            WHMCS.selectize.optionDecorator.product,
            configuration
        );

        instance.settings.searchField = ['id', 'name', 'noResults'];

        return instance;
    };

    this.html = function (selector, options, configuration) {
        var instance = this.register(
            selector,
            options,
            function(item, escape) {
                return '<div class="item">' + item.html + '</div>';
            },
            configuration
        );

        instance.settings.searchField = ['html'];

        return instance;
    };

    this.simple = function (selector, options, configuration) {
        var instance = this.register(
            selector,
            options,
            function(item, escape) {
                return '<div class="item">' + item.value + '</div>';
            },
            configuration
        );

        instance.settings.searchField = ['value'];

        return instance;
    };
    /**
     * Arguments:
     * selector
     *   CSS selector of the <select> element to selectize
     *
     * options
     *   The second argument is a JS array of objects that will be decorated
     *   into <option>s.
     *
     * decorator
     *   The third argument is the option decorator. By default, it will
     *   decorate using the userDecorator.  Value can be a global function,
     *   lambda, or fq function.  This argument will _not_ be applied when
     *   configuration supplies the .render.item or .render.option properties
     *
     * configuration
     *   configuration settings to use during Selectize initialization
     *
     *
     * Some Assumptions & Default settings:
     * settings.valueField and settings.labelField
     *   These are set to 'id' by default; change as needed
     *
     * settings.searchField
     *   Is empty by default; change as needed
     *
     * option and item decoration
     *   this.optionDecorator.user will be applied by default if nothing is
     *   supplied (by means of the decorator arg or within the configuration arg)
     *
     * @copyright Copyright (c) WHMCS Limited 2005-2018
     * @license http://www.whmcs.com/license/ WHMCS Eula
     */
    this.register = function (selector, options, decorator, configuration) {
        var self = this;
        var element = jQuery(selector);

        var instance = self.builder.init(element, configuration);

        // add item & option decorator if not provided in configuration
        var itemDecorator = self.builder.itemDecorator(decorator);
        if (typeof configuration === "undefined") {
            instance.settings.render.item = itemDecorator;
            instance.settings.render.option = itemDecorator;
        } else if (typeof configuration.render === "undefined") {
            instance.settings.render.item = itemDecorator;
            instance.settings.render.option = itemDecorator;
        } else {
            if (typeof configuration.render.item === "undefined") {
                instance.settings.render.item = itemDecorator;
            }
            if (typeof configuration.render.option === "undefined") {
                instance.settings.render.option = itemDecorator;
            }
        }

        this.builder.addOptions(instance, options);


        return instance;
    };

    this.optionDecorator = {
        client: function(item, escape) {
            var name = escape(item.name),
                companyname = '',
                descriptor = '',
                email = '';

            if (item.companyname) {
                companyname = ' (' + escape(item.companyname) + ')';
            }

            if (typeof item.descriptor === "undefined") {
                descriptor = (item.id > 0 ? ' - #' + escape(item.id) : '');
            } else {
                descriptor = escape(item.descriptor);
            }

            if (item.email) {
                email = '<span class="email">' + escape(item.email) + '</span>';
            }

            return '<div>'
                + '<span class="name">' + name + companyname + descriptor + '</span>'
                + email
                + '</div>';
        },
        user: function(item, escape) {
            var name = escape(item.name),
                descriptor = '',
                email = '',
                isNumericId = !isNaN(item.id);

            if (typeof item.descriptor === "undefined") {
                descriptor = (isNumericId && item.id > 0 ? ' - #' + escape(item.id) : '');
            } else {
                descriptor = escape(item.descriptor);
            }

            if (isNumericId && item.id > 0 && item.email) {
                email = '<span class="email">' + escape(item.email) + '</span>';
            }

            return '<div>'
                + '<span class="name">' + name + descriptor + '</span>'
                + email
                + '</div>';
        },
        billingContact: function(item, escape) {
            var name = escape(item.name),
                companyname = '',
                descriptor = '',
                email = '',
                address = '';

            if (item.companyname) {
                companyname = ' (' + escape(item.companyname) + ')';
            }

            if (typeof item.descriptor === "undefined") {
                descriptor = (item.id > 0 ? ' - #' + escape(item.id) : '');
            } else {
                descriptor = escape(item.descriptor);
            }

            if (item.email) {
                email = '<span class="email">' + escape(item.email) + '</span>';
            }

            if (item.address) {
                address = '<span class="email">' + escape(item.address) + '</span>';
            }

            return '<div>'
                + '<span class="name">' + name + companyname + descriptor + '</span>'
                + email
                + address
                + '</div>';
        },
        payMethod: function(item, escape) {
            var brandIcon = '',
                description = '',
                isDefault = '',
                shortAccountNumber = '',
                detail1 = '';

            if (item.brandIcon) {
                brandIcon = '<i class="' + item.brandIcon + '"></i>';
            }
            if (item.isDefault) {
                isDefault = '&nbsp;&nbsp;<i class="fal fa-user-check"></i>';
            }

            if (item.description) {
                description = item.description;
            }
            if (item.shortAccountNumber) {
                if (description.indexOf(item.shortAccountNumber) === -1) {
                    shortAccountNumber = '(' + escape(item.shortAccountNumber) + ')';
                }
            }

            if (item.detail1) {
                detail1 = '<span class="mouse">' + escape(item.detail1) + '</span>';
            }

            return '<div>'
                + '<span class="name"> '
                + brandIcon + '&nbsp;'
                + description + '&nbsp;'
                + shortAccountNumber + '&nbsp;'
                + '&nbsp;&nbsp;' + detail1 + '&nbsp;&nbsp;'
                + isDefault
                + '</span>'
                + '</div>';
        },
        service: function (item, escape) {
            var color = '';
            if (item.color) {
                color = ' style="background-color: ' + item.color + ';"';
            }
            return '<div' + color + '><span class="name">' + escape(item.name) + '</span>'
                 + (item.noResults ? '<span class="email">' + escape(item.noResults) + '</span>' : '') +
                '</div>';
        },
        product: function (item, escape) {
            return '<div><span class="name">' + escape(item.name) + '</span>'
                + (item.noResults ? '<span class="email">' + escape(item.noResults) + '</span>' : '') +
                '</div>';
        }
    };
    this.builder = {
        init: function (element, configuration)
        {
            var merged,
                defaults = {
                    plugins: ['whmcs_no_results'],
                    valueField: 'id',
                    labelField: 'id',
                    create: false,
                    maxItems: 1,
                    preload: 'focus'
                };

            if (typeof configuration === "undefined") {
                configuration = {};
            }
            merged = jQuery.extend({}, defaults, configuration);

            var thisSelectize = element.selectize(merged);
            /**
             * selectize assigns any items to an array. In order to be able to
             * run additional functions on this (like auto-submit and clear).
             *
             * @link https://github.com/brianreavis/selectize.js/blob/master/examples/api.html
             */
            thisSelectize = thisSelectize[0].selectize;

            thisSelectize.currentValue = '';

            thisSelectize.on('focus', function () {
                thisSelectize.currentValue = thisSelectize.getValue();
                thisSelectize.clear();
            });
            thisSelectize.on('blur', function () {
                var thisValue = thisSelectize.getValue(),
                    isNumeric = !(isNaN(thisValue)),
                    minValue = 1;
                if (element.data('allow-empty-option') === 1) {
                    minValue = 0;
                }
                if (
                    thisValue === ''
                    || (isNumeric && (thisValue < minValue))
                ) {
                    thisSelectize.setValue(thisSelectize.currentValue);
                }
            });

            return thisSelectize;
        },
        addOptions: function (selectize, options) {
            if (typeof options !== "undefined" && options.length) {
                selectize.addOption(options);
            }
        },
        itemDecorator: function (decorator) {
            if (typeof decorator === "function") {
                return decorator;
            } else if (typeof decorator === "undefined") {
                return WHMCS.selectize.optionDecorator.user;
            }
        },
        onLoadEvent: function (searchUrl, dataCallback) {
            return function (query, callback) {
                jQuery.ajax({
                    url: searchUrl,
                    type: 'POST',
                    dataType: 'json',
                    data: dataCallback(query),
                    error: function () {
                        callback();
                    },
                    success: function (res) {
                        callback(res);
                    }
                });
            };
        },
        onChangeEvent: function (instance, onChangeSelector) {
            var onChange;
            if (typeof onChangeSelector !== "undefined") {
                onChange = function (value) {
                    var changeSelector = jQuery(onChangeSelector);
                    if (changeSelector.length) {
                        if (
                            !(isNaN(instance.currentValue))
                            && instance.currentValue > 0
                            && (value.length && value !== instance.currentValue)
                        ) {
                            changeSelector.click();
                        }
                    }
                }
            }

            return onChange;
        }
    };

    return this;
});

/**
 * WHMCS client area checkout and invoice payment UX module integration interface.
 * Stability: alpha - no guarantees are made against the stability of this interface.
 * @copyright Copyright (c) WHMCS Limited 2005-2023
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */
(function(module) {
    if (!WHMCS.hasModule('payment')) {
        WHMCS.loadModule('payment', module);
    }
})({

internal: function () {

    this.isRenderSource = function (source) {
        return [
            'checkout',
            'invoice-pay',
            'admin-payment-method-add',
            'admin-payment-method-edit',
            'payment-method-add',
            'payment-method-edit',
        ].includes(source);
    }

    this.reportUnknownSource = function (source) {
        if (!WHMCS.payment.internal.isRenderSource(source)) {
            WHMCS.payment.internal.logError('unknown source: ' + source);
            return true;
        }
        return false;
    }

    this.logError = function (error) {
        console.error('[WHMCS.payment] ' + error);
    }
},

handler: function () {
    this.make = function (moduleName) {
        function Handler(moduleName) {
            this.module = moduleName;

            this.onGatewayInit = function (fn, options = {}) {
                var eventOptions = {...WHMCS.payment.register.defaultEventOpts(), ...options};
                WHMCS.payment.register.onGatewayInit(this.module, fn, eventOptions);
                return this;
            }

            this.onGatewayOptionInit = function (fn, options = {}) {
                var eventOptions = {...WHMCS.payment.register.defaultEventOpts(), ...options};
                WHMCS.payment.register.onGatewayOptionInit(this.module, fn, eventOptions);
                return this;
            }

            this.onGatewaySelected = function (fn, options = {}) {
                var eventOptions = {...WHMCS.payment.register.defaultEventOpts(), ...options};
                WHMCS.payment.register.onGatewaySelected(this.module, fn, eventOptions);
                return this;
            }

            this.onGatewayUnselected = function (fn, options = {}) {
                var eventOptions = {...WHMCS.payment.register.defaultEventOpts(), ...options};
                WHMCS.payment.register.onGatewayUnselected(this.module, fn, eventOptions);
                return this;
            }

            this.onCheckoutFormSubmit = function (fn, options = {}) {
                var eventOptions = {...WHMCS.payment.register.defaultEventOpts(), ...options};
                WHMCS.payment.register.onCheckoutFormSubmit(this.module, fn, eventOptions);
                return this;
            }
            this.onAddPayMethodFormSubmit = function (fn, options = {}) {
                var eventOptions = {...WHMCS.payment.register.defaultEventOpts(), ...options};
                WHMCS.payment.register.onAddPayMethodFormSubmit(this.module, fn, eventOptions);
                return this;
            }

            this.manageInputsContainer = function (selector, options = {}) {
                var eventOptions = {
                    ...WHMCS.payment.register.defaultEventOpts(),
                    ...{priority: 1},
                    ...options
                };
                this.onGatewayInit(function (metadata, element) {
                    if (metadata._source != 'invoice-pay') return;
                    WHMCS.payment.display.reset();
                    WHMCS.payment.display.show(jQuery(selector));
                }, eventOptions);
                this.onGatewaySelected(function (metadata, element) {
                    if (metadata._source == 'payment-method-add') {
                        WHMCS.payment.display.reset();
                        jQuery('div.fieldgroup-creditcard'
                            + ',div.fieldgroup-bankaccount'
                            + ',div.fieldgroup-auxfields').hide();
                    }
                    WHMCS.payment.display.show(jQuery(selector));
                }, eventOptions);
                this.onGatewayUnselected(function (metadata, element) {
                    WHMCS.payment.display.hide(jQuery(selector));
                }, eventOptions);
                return this;
            }
        }
        return new Handler(moduleName);
    }
},

register: function () {

    this.onGatewayInit = function (module, fn, options) {
        if (!this.isFunction('register.gatewayInit', fn)) return this;
        this.registerForEvent(
            WHMCS.payment.event.observersGatewayInit,
            module,
            fn,
            options
        )
        return this;
    }

    this.onGatewayOptionInit = function (module, fn, options) {
        if (!this.isFunction('register.gatewayOptionInit', fn)) return this;
        this.registerForEvent(
            WHMCS.payment.event.observersGatewayOptionInit,
            module,
            fn,
            options
        )
        return this;
    }

    this.onGatewaySelected = function (module, fn, options) {
        if (!this.isFunction('register.onGatewaySelected', fn)) return this;
        this.registerForEvent(
            WHMCS.payment.event.observersGatewaySelected,
            module,
            fn,
            options
        )
        return this;
    }

    this.onGatewayUnselected = function (module, fn, options) {
        if (!this.isFunction('register.onGatewayUnselected', fn)) return this;
        this.registerForEvent(
            WHMCS.payment.event.observersGatewayUnselected,
            module,
            fn,
            options
        )
        return this;
    }

    this.onCheckoutFormSubmit = function (module, fn, options) {
        if (!this.isFunction('register.onCheckoutFormSubmit', fn)) return this;
        this.registerForEvent(
            WHMCS.payment.event.observersCheckoutFormSubmit,
            module,
            fn,
            options
        )
        return this;
    }

    this.onAddPayMethodFormSubmit = function (module, fn, options) {
        if (!this.isFunction('register.onAddPayMethodFormSubmit', fn)) return this;
        this.registerForEvent(
            WHMCS.payment.event.observersAddPayMethodFormSubmit,
            module,
            fn,
            options
        )
        return this;
    }

    this.defaultEventOpts = function () {
        return {
            priority: 100,
            once: false,
        };
    }

    this.registerForEvent = function (observerMap, module, fn, options) {
        if (!observerMap.has(module)) {
            observerMap.set(module, new Map);
        }
        observerMap.get(module).set(options.priority, {
            _fn: fn,
            ...options,
        });
        return this;
    }

    this.isFunction = function (label, fn) {
        if (typeof fn != 'function') {
            console.error('[register.' + label + '] Expecting a function, got ' + fn);
            return false;
        }
        return true;
    }
},

event: function () {
    this.observersGatewayInit = new Map;
    this.observersGatewayOptionInit = new Map;
    this.observersGatewaySelected = new Map;
    this.observersGatewayUnselected = new Map;
    this.observersCheckoutFormSubmit = new Map;
    this.observersAddPayMethodFormSubmit = new Map;
    this.previouslySelected = null;

    this.gatewayInit = function (metadata, module) {
        this.notifyEvent(
            'gatewayInit',
            this.observersGatewayInit,
            module,
            metadata
        );
    }

    this.gatewayOptionInit = function (metadata, module, formElement) {
        this.notifyEvent(
            'gatewayOptionInit',
            this.observersGatewayOptionInit,
            module,
            metadata,
            formElement
        );
    }

    this.gatewaySelected = function (metadata, module, formElement) {
        this.previouslySelected = {
            formElement: formElement,
            module: module,
        };
        this.notifyEvent(
            'gatewaySelected',
            this.observersGatewaySelected,
            module,
            metadata,
            formElement
        );
    }

    this.gatewayUnselected = function (metadata) {
        if (this.previouslySelected == null) return;
        this.notifyEvent(
            'gatewayUnselected',
            this.observersGatewayUnselected,
            this.previouslySelected.module,
            metadata,
            this.previouslySelected.formElement
        );
    }

    this.checkoutFormSubmit = function (metadata, module, formElement) {
        this.notifyEvent(
            'checkoutFormSubmit',
            this.observersCheckoutFormSubmit,
            module,
            metadata,
            formElement
        );
    }

    this.addPayMethodFormSubmit = function (metadata, module, formElement) {
        this.notifyEvent(
            'addPayMethodFormSubmit',
            this.observersAddPayMethodFormSubmit,
            module,
            metadata,
            formElement
        );
    }

    this.notifyEvent = function (eventName, observersMap, module, metadata, formElement) {
        if (!observersMap.has(module)) {
            return;
        }
        var observers = observersMap.get(module);
        var destruct = [];
        this.notifyOrdered(observers, function (observer, priority) {
            observer._fn(metadata, formElement);
            if (observer.once) {
                destruct.push(priority);
            }
        });
        destruct.forEach(function (k) {
            observers.delete(k);
        })
    }

    this.notifyOrdered = function (observersMap, fn) {
        (new Map([...observersMap.entries()].sort())).forEach(fn);
    }
},

query: function () {

    this.isGatewaySelected = function (module) {
        return (
            WHMCS.payment.event.previouslySelected != null
            && WHMCS.payment.event.previouslySelected.module == module
        );
    }

},

behavior: function () {

    this.disableDefaultCardValidation = function (source) {
        if (source == 'invoice-pay') {
            if (typeof validateCreditCardInput === 'function') {
                jQuery('#frmPayment').off('submit', validateCreditCardInput);
            }
        } else if (source == 'checkout') {
            if (typeof validateCheckoutCreditCardInput === 'function') {
                jQuery('#frmCheckout').off('submit', validateCheckoutCreditCardInput);
            }
        } else {
            WHMCS.payment.internal.reportUnknownSource(source);
        }
    }

    this.enableDefaultCardValidation = function (source) {
        if (source == 'invoice-pay') {
            if (typeof validateCreditCardInput === 'function') {
                jQuery('#frmPayment').on('submit', validateCreditCardInput);
            }
        } else if (source == 'checkout') {
            if (typeof validateCheckoutCreditCardInput === 'function') {
                jQuery('#frmCheckout').on('submit', validateCheckoutCreditCardInput);
            }
        } else {
            WHMCS.payment.internal.reportUnknownSource(source);
        }
    }

},

display: function () {

    this.reset = function () {
        var container = jQuery('#paymentGatewayInput');
        if (container.length == 0) return;
        var existing = container.children();
        existing.hide();
        jQuery('body').append(existing);
        return this;
    }

    this.show = function (inputContainer) {
        var container = jQuery('#paymentGatewayInput');
        if (container.length == 0) return;
        container.append(inputContainer);
        inputContainer.slideDown();
        return this;
    }

    this.hide = function (inputContainer) {
        inputContainer.slideUp({
            complete: function () {
                jQuery('body').append(inputContainer);
            },
        });
        return this;
    }

    this.error = function (errorMessage) {
        jQuery('.gateway-errors').html(errorMessage);
        return this;
    }

    this.errorClear = function () {
        let gatewayErrorsContainer = jQuery('.gateway-errors');
        if (gatewayErrorsContainer.length == 0) return;
        this.error('');
        gatewayErrorsContainer.slideUp();
        return this;
    }

    this.errorShow = function (errorMessage) {
        let gatewayErrorsContainer = jQuery('.gateway-errors');
        if (gatewayErrorsContainer.length == 0) return;
        this.error(errorMessage);
        gatewayErrorsContainer.slideDown()
        return this;
    }

    this.submitReset = function (source) {
        if (source == 'invoice-pay') {
            this.invoiceSubmitReset();
        } else if (source == 'checkout') {
            this.checkoutSubmitReset();
        } else {
            WHMCS.payment.internal.reportUnknownSource(source);
        }
    };

    this.invoiceSubmitReset = function () {
        let btnSubmit = jQuery('#btnSubmit').prop('disabled', false)
            .removeClass('disabled');
        btnSubmit.find('.click-text').hide();
        btnSubmit.find('.pay-text').show();
    }

    this.checkoutSubmitReset = function () {
        jQuery('#btnCompleteOrder').removeClass('disabled')
            .removeClass('disable-on-click')
            .removeClass('spinner-on-click')
            .addClass('disable-on-click spinner-on-click')
            .prop('disabled', false)
            .find('i.fas')
                .removeAttr('class')
                .addClass('fas fa-arrow-circle-right');
    }

    this.submitDisable = function (source) {
        if (source == 'invoice-pay') {
            this.invoiceSubmitDisable();
        } else if (source == 'checkout') {
            this.checkoutSubmitDisable();
        } else {
            WHMCS.payment.internal.reportUnknownSource(source);
        }
    };

    this.invoiceSubmitDisable = function () {
        jQuery('#btnSubmit').addClass('disabled')
            .prop('disabled', true);
    }

    this.checkoutSubmitDisable = function () {
        jQuery('#btnCompleteOrder').addClass('disabled')
            .prop('disabled', true);
    }
},

});

jQuery(document).ready(function() {
    jQuery('[data-toggle="tooltip"]').tooltip();
    jQuery('[data-toggle="popover"]').popover();
    jQuery('.inline-editable').editable({
        mode: 'inline',
        params: function(params) {
            params.action = 'savefield';
            params.token = csrfToken;
            return params;
        }
    });

    generateBootstrapSwitches();

    jQuery('select.form-control.enhanced').select2({
        theme: 'bootstrap'
    });

    jQuery('body').on('click', '.copy-to-clipboard', WHMCS.ui.clipboard.copy);

    jQuery(".credit-card-type li a").click(function() {
        jQuery("#selectedCard").html(jQuery(this).html());
        jQuery("#cctype").val(jQuery('span.type', this).html());
    });

    jQuery('.paging-dropdown li a,.page-selector').click(function() {
        if (jQuery(this).parent().hasClass('disabled')) {
            return false;
        }
        var form = jQuery('#frmRecordsFound');
        jQuery("#currentPage").html(jQuery(this).data('page'));
        form.find('input[name="page"]')
            .val(jQuery(this).data('page')).end();
        form.submit();
        return false;
    });

    jQuery(".no-results a").click(function(e) {
        e.preventDefault();
        jQuery('#checkboxShowHidden').bootstrapSwitch('state', false);
    });

    jQuery('body').on('click', 'a.autoLinked', function (e) {
        e.preventDefault();
        if (jQuery(this).hasClass('disabled')) {
            return false;
        }

        var child = window.open();
        child.opener = null;
        child.location = $(this).attr('href');
    });

    jQuery('#divModuleSettings').on('click', '.icon-refresh', function() {
        fetchModuleSettings(jQuery(this).data('product-id'), 'simple');
        processAddonDisplay();
    });

    jQuery('#mode-switch').click(function() {
        fetchModuleSettings(jQuery(this).data('product-id'), jQuery(this).attr('data-mode'));
    });

    $('body').on('click', '.modal-wizard .modal-submit', function() {
        var modal = $('#modalAjax');
        modal.find('.loader').show();
        modal.find('.modal-submit').prop('disabled', true);

        $('.modal-wizard .wizard-step:hidden :input').attr('disabled', true);

        var form = document.forms.namedItem('frmWizardContent'),
            oData = new FormData(form),
            currentStep = $('.modal-wizard .wizard-step:visible').data('step-number'),
            ccGatewayFormSubmitted = $('#ccGatewayFormSubmitted').val(),
            enomFormSubmitted = $('#enomFormSubmitted').val(),
            oReq = new XMLHttpRequest();

        if ((ccGatewayFormSubmitted && currentStep == 3) || (enomFormSubmitted && currentStep == 5)) {
            wizardStepTransition(false, true);
            fadeoutLoaderAndAllowSubmission(modal);
        } else {

            oReq.open('POST', $('#frmWizardContent').attr('action'), true);

            oReq.send(oData);
            oReq.onload = function () {
                if (oReq.status == 200) {
                    try {
                        var data = JSON.parse(oReq.responseText),
                            doNotShow = $('#btnWizardDoNotShow');
                        if (doNotShow.is(':visible')) {
                            doNotShow.fadeOut('slow', function () {
                                $('#btnWizardSkip').hide().removeClass('hidden').fadeIn('slow');
                            });
                        }

                        if (data.success) {
                            if (data.sslData) {
                                var sslData = data.sslData;
                                if (sslData.approverEmails) {
                                    for (i = 0; i < sslData.approverEmails.length; i++) {
                                        var email = sslData.approverEmails[i];
                                        $('.modal-wizard .cert-approver-emails')
                                            .append('<label class="radio-inline">' +
                                                '<input type="radio" name="approver_email" value="' + email + '"> '
                                                + email + '</label><br>');
                                    }
                                }
                                if (sslData.approvalMethods) {
                                    for (i = 0; i < sslData.approvalMethods.length; i++) {
                                        $("label[for='" + sslData.approvalMethods[i] + "Method']")
                                            .removeClass('hidden').show();
                                    }
                                }
                            } else if (data.authData) {
                                var authData = data.authData;
                                if (authData.method == 'emailauth') {
                                    $('.modal-wizard .cert-email-auth').removeClass('hidden');
                                    $('.modal-wizard .cert-email-auth-emailapprover').val(authData.email);
                                } else if (authData.method == 'fileauth') {
                                    $('.modal-wizard .cert-file-auth').removeClass('hidden');
                                    $('.modal-wizard .cert-file-auth-filename')
                                        .val('http://<domain>/' + authData.path + '/' + authData.name);
                                    $('.modal-wizard .cert-file-auth-contents').val(authData.contents);
                                } else if (authData.method == 'dnsauth') {
                                    $('.modal-wizard .cert-dns-auth').removeClass('hidden');
                                    $('.modal-wizard .cert-dns-auth-contents').val(authData.value);
                                    $('.modal-wizard .cert-dns-auth-host').val(authData.host);
                                    $('.modal-wizard .cert-dns-auth-type').val(authData.type);
                                }
                            }

                            if (data.refreshMc) {
                                $('#btnMcServiceRefresh').click();
                            }
                            wizardStepTransition(data.skipNextStep, false);
                        } else {
                            wizardError(data.error);
                        }
                    } catch (err) {
                        wizardError('An error occurred while communicating with the server. Please try again.');
                    } finally {
                        fadeoutLoaderAndAllowSubmission(modal);
                    }
                } else {
                    alert('An error occurred while communicating with the server. Please try again.');
                    modal.find('.loader').fadeOut();
                }
            };
        }
    }).on('click', '#btnWizardSkip', function(e) {
        e.preventDefault();
        var currentStep = $('#inputWizardStep').val(),
            skipTwo = false;

        if (currentStep === '2' || currentStep === '4') {
            skipTwo = true;
        }

        trackWizardPageView(currentStep, 'skipped')

        wizardStepTransition(skipTwo, true);
    }).on('click', '#btnWizardBack', function(e) {
        e.preventDefault();
        wizardStepBackTransition();
    }).on('click', '#btnWizardDoNotShow', function(e) {
        e.preventDefault();
        WHMCS.http.jqClient.post('wizard.php', 'dismiss=true', function() {
            //Success or no, still hide now
            $('#modalAjax').modal('hide');
        });
    });

    $('#modalAjax').on('hidden.bs.modal', function (e) {
        if ($('#modalAjax').hasClass('modal-wizard')) {
            $('#btnWizardSkip').remove();
            $('#btnWizardBack').remove();
            $('#btnWizardDoNotShow').remove();
        }
    });

    $('#prodsall').click(function () {
        var checkboxes = $('.checkprods');
        checkboxes.filter(':visible').prop('checked', $(this).prop('checked')).end();
        if ($(this).prop('checked')) {
            checkboxes.filter(':hidden').prop('checked', !$(this).prop('checked')).end();
        }
    });
    $('#addonsall').click(function () {
        var checkboxes = $('.checkaddons');
        checkboxes.filter(':visible').prop('checked', $(this).prop('checked')).end();
        if ($(this).prop('checked')) {
            checkboxes.filter(':hidden').prop('checked', !$(this).prop('checked')).end();
        }
    });
    $('#domainsall').click(function () {
        var checkboxes = $('.checkdomains');
        checkboxes.filter(':visible').prop('checked', $(this).prop('checked')).end();
        if ($(this).prop('checked')) {
            checkboxes.filter(':hidden').prop('checked', !$(this).prop('checked')).end();
        }
    });

    jQuery('#addPayment').submit(function (e) {
        e.preventDefault();

        const action = getQueryParam('action');
        if (action === 'edit') {
            handleUnsavedChanges(e, function() {
                handleAddPaymentSubmit();
            });
        } else {
            handleAddPaymentSubmit();
        }
    });

    function handleAddPaymentSubmit() {
        addingPayment = false;
        jQuery('#btnAddPayment').attr('disabled', 'disabled');
        jQuery('#paymentText').hide();
        jQuery('#paymentLoading').removeClass('hidden').show();


        var postData = Object.fromEntries(new FormData(document.forms.namedItem('addPayment'))),
            post = WHMCS.http.jqClient.post(
                WHMCS.adminUtils.getAdminRouteUrl('/billing/check-transaction'),
                {
                    token: postData.token,
                    transaction_id: postData.transid,
                    payment_method: postData.paymentmethod
                }
            );

        post.done(function (data) {
            if (data.unique === false) {
                jQuery('#modalDuplicateTransaction').modal('show');
            } else {
                addInvoicePayment();
            }
        });
    }

    $('#modalDuplicateTransaction').on('hidden.bs.modal', function () {
        if (addingPayment === false) {
            jQuery('#paymentLoading').hide('fast', function() {
                jQuery('#paymentText').show('fast');
                jQuery('#btnAddPayment').removeAttr('disabled');
            });
        }
    });

    jQuery(document).on('click', '.feature-highlights-content .btn-action-1, .feature-highlights-content .btn-action-2', function() {
        var linkId = jQuery(this).data('link'),
            linkTitle = jQuery(this).data('link-title');

        WHMCS.http.jqClient.post(
            'whatsnew.php',
            {
                action: "link-click",
                linkId: linkId,
                linkTitle: linkTitle,
                token: csrfToken
            }
        );
    });

    /**
     * Admin Tagging
     */
    if (typeof mentionsFormat !== "undefined") {
        jQuery('#replynote[name="message"],#note[name="note"]').atwho({
            at: "@",
            displayTpl: "<li class=\"mention-list\">${gravatar} ${username} - ${name} (${email})</li>",
            insertTpl: mentionsFormat,
            data: WHMCS.adminUtils.getAdminRouteUrl('/mentions'),
            limit: 5
        });
    }

    jQuery('.search-bar .search-icon').click(function(e) {
        jQuery('.search-bar').find('input:first').focus();
    });
    jQuery('.btn-search-advanced').click(function(e) {
        jQuery(this).closest('.search-bar').find('.advanced-search-options').slideToggle('fast');
    });

    // DataTable data-driven auto object registration
    WHMCS.ui.dataTable.register();

    // Bootstrap Confirmation popup auto object registration
    WHMCS.ui.confirmation.register();

    var mcProductPromos = jQuery("#mcConfigureProductPromos");

    if (mcProductPromos.length) {
        var itemCount = mcProductPromos.find('.item').length;
        mcProductPromos.owlCarousel({
            loop: true,
            margin: 10,
            responsiveClass: true,
            responsive: {
                0: {
                    items: 1
                },
                850: {
                    items: (itemCount < 2 ? itemCount : 2)
                },
                1250: {
                    items: (itemCount < 3 ? itemCount : 3)
                },
                1650: {
                    items: (itemCount < 4 ? itemCount : 4)
                }
            }
        });

        jQuery('#dismissPromos').on('click', function() {
            mcProductPromos.slideUp('fast');
            jQuery(this).hide();
            WHMCS.http.jqClient.post(
                WHMCS.adminUtils.getAdminRouteUrl('/dismiss-marketconnect-promo'),
                {
                    token: csrfToken
                },
                function (data) {
                    //do nothing
                }
            );
        });
    }

    jQuery(document).on('submit', '#frmCreditCardDeleteDetails', function(e) {
        e.preventDefault();
        jQuery('#modalAjax .modal-submit').prop("disabled", true);
        jQuery('#modalAjax .loader').show();
        $('#remoteFailureDetails').slideUp();
        WHMCS.http.jqClient.post(
            jQuery(this).attr('action'),
            jQuery(this).serialize(),
            function(data) {
                if (!data.error) {
                    updateAjaxModal(data);
                } else {
                    $('#remoteFailureDetails')
                        .find('.alert').html(data.errorMsg)
                        .end()
                        .slideDown();

                    jQuery('#modalAjax .loader').fadeOut();
                }
            },
            'json'
        ).fail(function() {
            jQuery('#modalAjax .modal-body').html('An error occurred while communicating with the server. Please try again.');
            jQuery('#modalAjax .loader').fadeOut();
        });
    });

    if (jQuery('.captcha-type').length) {
        jQuery(document).on('change', '.captcha-type', function() {
            jQuery('#captcha-preview').attr(
                'src',
                jQuery(this).find(':selected').data('image')
            );
            let recaptchaSettings = jQuery('.recaptchasetts'),
                recaptchaV3Settings = jQuery('.recaptchav3setts'),
                hCaptchaSettings = jQuery('.hcaptchasetts'),
                captchaType = jQuery(this).val();

            if (['recaptcha', 'invisible'].includes(captchaType)) {
                recaptchaSettings.show();
                recaptchaV3Settings.hide();
                hCaptchaSettings.hide();
            } else if (['hcaptcha', 'hcaptcha-invisible'].includes(captchaType)) {
                recaptchaSettings.hide();
                recaptchaV3Settings.hide();
                hCaptchaSettings.show();
            } else if ('recaptchav3' === captchaType) {
                hCaptchaSettings.hide();
                recaptchaSettings.show();
                recaptchaV3Settings.show();
            } else {
                recaptchaSettings.hide();
                hCaptchaSettings.hide();
                recaptchaV3Settings.hide();
            }
        });
    }

    if (jQuery('#frmClientSearch').length) {
        jQuery(document).on('change', '.status', function() {
            jQuery('#status').val(jQuery(this).val());
        });
    }

    jQuery('.ssl-state.ssl-sync').each(function () {
        var self = jQuery(this);
        WHMCS.http.jqClient.post(
            WHMCS.adminUtils.getAdminRouteUrl('/domains/ssl-check'),
            {
                'domain': self.data('domain'),
                'userid': self.data('user-id'),
                'token': csrfToken
            },
            function (data) {
                self.replaceWith('<img src="' + data.image + '" data-toggle="tooltip" title="' + data.tooltip + '" class="' + data.class + '">');
                jQuery('[data-toggle="tooltip"]').tooltip();
            }
        );
    });

    (function ($) {
        $.fn.setInputError = function(error) {
            this.parents('.form-group').addClass('has-error').find('.field-error-msg').text(error);
            return this;
        };
    })(jQuery);

    (function ($) {
        $.fn.showInputError = function () {
            this.parents(".form-group").addClass("has-error").find(".field-error-msg").show();
            return this;
        };
    })(jQuery);

    // Admin datatable row expand functionality
    jQuery('.datatable .view-detail').click(function(e) {
            e.preventDefault();
            $currentRow = jQuery(this).closest('tr');
            var loader = '<i class="fa fa-spinner fa-spin"></i> Loading...';
            if (jQuery(this).hasClass('expanded')) {
                $currentRow.next('tr.detail-row').hide();
                jQuery(this).removeClass('expanded').find('i').removeClass('fa-minus').addClass('fa-plus');
            } else {
                var colCount = $currentRow.find('td').length;
                if (jQuery(this).hasClass('data-loaded')) {
                    $currentRow.next('tr.detail-row').show();
                } else {
                    var $newRow = $currentRow.after('<tr class="detail-row"><td colspan="' + colCount + '">' + loader + '</td></tr>');
                    WHMCS.http.jqClient.jsonGet({
                        url: jQuery(this).attr('href'),
                        success: function(response) {
                            $currentRow.next('tr.detail-row').remove();
                            $currentRow.after('<tr class="detail-row"><td colspan="' + colCount + '">' + response.output + '</td></tr>');
                        }
                    });
                }
                jQuery(this).find('i').addClass('fa-minus').removeClass('fa-plus');
                jQuery(this).addClass('expanded').addClass('data-loaded');
            }
        });
    jQuery(document).on('change', '.toggle-display', function() {
        var showElement = jQuery(this).data('show'),
            element = jQuery('.' + showElement);
        jQuery(document).find('div.toggleable').hide();
        if (element.hasClass('hidden')) {
            element.removeClass('hidden');
        }
        element.show();
    });

    jQuery(document).on('click', 'button.disable-submit', function(e) {
        var button = jQuery(this),
            form = button.closest('form');

        button.prepend('<i class="fas fa-spinner fa-spin"></i> ')
            .addClass('disabled')
            .prop('disabled', true);

        form.submit();
    });

    /**
     * Resend verification email button handler.
     */
    jQuery('#btnResendVerificationEmail').click(function() {
        var button = $(this);
        button.prop('disabled', true).html('<i class="fa fa-spinner fa-spin fa-fw"></i> ' + button.html());
        WHMCS.http.jqClient.jsonPost(
                {
                    url: window.location.href,
                    data: {
                        token: csrfToken,
                        action: 'resendVerificationEmail',
                        userid: button.data('clientid')
                    },
                    success: function(data) {
                        if (data.success) {
                            button.html(button.data('successmsg'));
                        } else {
                            button.html(button.data('errormsg'));
                        }
                    }
                }
            );
    });

    if (typeof Selectize !== 'undefined') {
        Selectize.define('whmcs_no_results', function (options) {
            var self = this;
            this.search = (function () {
                var original = self.search;

                return function () {
                    var results = original.apply(this, arguments);

                    var isActualItem = function (item) {
                        // item.id may be 'client' - this is an actual item
                        return isNaN(item.id) || item.id > 0;
                    };

                    var actualItems = results.items.filter(function (item) {
                        return isActualItem(item);
                    });

                    var noResultsItems = results.items.filter(function (item) {
                        return !isActualItem(item);
                    });

                    if (actualItems.length > 0) {
                        results.items = actualItems;
                    } else if (noResultsItems.length > 0) {
                        results.items = [noResultsItems[0]];
                    }

                    return results;
                };
            })();
        });
    }

    jQuery('.addon-type[name="atype"]').on('change', function() {
        fetchModuleSettings(jQuery(this).closest('td').data('addon-id'));
        processAddonDisplay();
    });

    jQuery(document).on('change', '.module-action-control', function() {
        var actionActor = $(this).data('actor');
        var params = jQuery('.module-action-param-row[data-action-type="' + actionActor + '"]');

        if (parseInt($(this).val())) {
            params.show();
        } else {
            params.hide();
        }
    });

    jQuery(document).on('click', '.btn-create-module-action-custom-field', function() {
        var self = this;
        var productId = jQuery(self).data('product-id');

        jQuery(self).attr('disabled', 'disabled');

        WHMCS.http.jqClient.jsonPost({
            url: 'configproducts.php',
            data: {
                action: 'create-module-action-custom-field',
                id: productId,
                token: csrfToken,
                field_name: jQuery(self).data('field-name'),
                field_type: jQuery(self).data('field-type')
            },
            success: function (data) {
                var btnSave = jQuery('#btnSaveProduct');

                if (jQuery(btnSave).attr('disabled')) {
                    jQuery.growl.notice(
                        {
                            title: '',
                            message: data.successMsg
                        }
                    );
                } else {
                    jQuery(btnSave).trigger('click');
                }
            },
            error: function (data) {
                jQuery(self).removeAttr('disabled');

                jQuery.growl.warning(
                    {
                        title: '',
                        message: data
                    }
                );
            }
        });
    });

    jQuery.each(jQuery('table.table-themed.data-driven'), function () {
        var self = $(this),
            table = self.DataTable();
        table.on('preXhr.dt', function (e, settings, data) {
            var d = document.createElement('div');
            jQuery(d).css({
                'background-color': '#fff',
                'opacity': '0.5',
                'position': 'absolute',
                'top': self.offset().top,
                'left': self.offset().left,
                'width': self.width() + 2,
                'height': self.height() + 2,
                'line-height': self.height() + 'px',
                'font-size': 40 + 'px',
                'text-align': 'center',
                'color': '#000',
                'border-radius': self.css('border-radius'),
                'zIndex': 100
            })
                .attr('id', self.attr('id') + 'overlay')
                .html('<strong><i class="fas fa-spinner fa-pulse"></i></strong>');
            self.before(d);
            data.token = csrfToken;
        });
        table.on('xhr.dt', function ( e, settings, info, xhr ) {
            jQuery('#' + self.attr('id') + 'overlay').remove();
            self.removeClass('text-muted');
        });
    });
});

var addingPayment = false,
    loadedModuleConfiguration = false,
    addonSupportsFeatures = false;

function updateServerGroups(requiredModule) {
    var optionServerTypes = '';
    var doShowOption = false;

    $('#inputServerGroup').find('option:not([value=0])').each(function() {
        optionServerTypes = $(this).attr('data-server-types');

        if (requiredModule && optionServerTypes) {
            doShowOption = (optionServerTypes.indexOf(',' + requiredModule + ',') > -1);
        } else {
            doShowOption = true;
        }

        if (doShowOption) {
            $(this).attr('disabled', false);
        } else {
            $(this).attr('disabled', true);

            if ($(this).is(':selected')) {
                $('#inputServerGroup').val('0');
            }
        }
    });
}

function processAddonDisplay()
{
    var element = jQuery('input[name="atype"]:checked');
    if (!loadedModuleConfiguration) {
        setTimeout(processAddonDisplay, 100);
        return;
    }
    var packageList = jQuery('#associatedPackages'),
        typeAndGroupRows = jQuery('#rowProductType,#rowServerGroup');
    packageList.find('option').prop('disabled', false);
    if (addonSupportsFeatures) {
        jQuery('#addonProvisioningType').find('div.radio').each(function() {
            $(this).removeClass('radio-disabled').find('input').prop('disabled', false);
        });
    }
    if (element.val() === 'feature') {
        packageList.find('option[data-server-module!="' + $('#inputModule').val() + '"]')
            .prop('checked', false)
            .prop('disabled', true);
        typeAndGroupRows.find('select').addClass('disabled').prop('disabled', true);
    } else {
        packageList.find('option').prop('disabled', false);
        typeAndGroupRows.find('select').removeClass('disabled').prop('disabled', false)
            .find('option[value="notAvailable"]').remove();
    }
    packageList.bootstrapDualListbox('refresh', true);
}

function fetchModuleSettings(productId, mode) {
    var gotValidResponse = false;
    var dataResponse = '';
    var switchLink = $('#mode-switch');
    var module = $('#inputModule').val();
    var addonProvisioningType = jQuery('#addonProvisioningType');

    if (module === "") {
        $('#divModuleSettings').html('');
        $('#noModuleSelectedRow').removeClass('hidden');
        $('#tblModuleAutomationSettings').find('input[type=radio]').attr('disabled', true);
        if (addonProvisioningType.length) {
            jQuery('input[name="atype"]').first().prop('checked', true);
            addonProvisioningType.find('div.radio').each(function(index) {
                $(this).addClass('radio-disabled').find('input').prop('disabled', true);
            });
        }
        return;
    }

    loadedModuleConfiguration = false;
    mode = mode || 'simple';
    if (mode !== 'simple' && mode !== 'advanced') {
        mode = 'simple';
    }
    requestedMode = mode;
    $('#divModuleSettings').addClass('module-settings-loading');
    $('#tblModuleAutomationSettings').addClass('module-settings-loading');
    $('#tblMetricSettings').addClass('module-settings-loading');
    $('#serverReturnedError').addClass('hidden');
    $('#moduleSettingsLoader').removeClass('hidden').show();
    switchLink.attr('data-product-id', productId);
    WHMCS.http.jqClient.post(window.location.pathname, {
        'action': 'module-settings',
        'module': module,
        'servergroup': $('#inputServerGroup').val(),
        'id': productId,
        'type': $('#selectType').val(),
        'atype': $('input[name="atype"]:checked').val(),
        'mode': mode
    },
    function(data) {
        gotValidResponse = true;
        $('#divModuleSettings').removeClass('module-settings-loading');
        $('#tblModuleAutomationSettings').removeClass('module-settings-loading');
        $('#tblMetricSettings').removeClass('module-settings-loading');
        $('#divModuleSettings').html('');
        switchLink.parent('div .module-settings-mode').addClass('hidden');
        if (module && data.error) {
            $('#serverReturnedErrorText').html(data.error);
            $('#serverReturnedError').removeClass('hidden');
        }
        if (module && data.content) {
            $('#noModuleSelectedRow').addClass('hidden');
            $('#divModuleSettings').html(data.content);
            $('#tblModuleAutomationSettings').find('input[type=radio]').removeAttr('disabled');
            if (data.mode === 'simple') {
                switchLink.attr('data-mode', 'advanced').find('span').addClass('hidden').parent().find('.text-advanced').removeClass('hidden');
                switchLink.parent('div .module-settings-mode').removeClass('hidden');
            } else {
                if (data.mode === 'advanced' && requestedMode === 'advanced') {
                    switchLink.attr('data-mode', 'simple').find('span').addClass('hidden').parent().find('.text-simple').removeClass('hidden');
                    switchLink.parent('div .module-settings-mode').removeClass('hidden');
                } else {
                    switchLink.parent('div .module-settings-mode').addClass('hidden');
                }
            }
            if (data.metrics) {
                $('#metricsConfig').html(data.metrics).show();
                $('#tblMetricSettings').removeClass('hidden').show();
                $('.metric-toggle').bootstrapSwitch({
                    size: 'mini',
                    onColor: 'success'
                }).on('switchChange.bootstrapSwitch', function(event, state) {
                    WHMCS.http.jqClient.post($(this).data('url'), 'action=toggle-metric&id=' + $('#inputProductId').val() + '&module=' + module + '&metric=' + $(this).data('metric') + '&token=' + csrfToken + '&enable=' + state);
                });
            } else {
                $('#tblMetricSettings').hide();
            }
            if (addonProvisioningType.length) {
                var packageList = jQuery('#associatedPackages'),
                    selectElements = jQuery('#selectType,#inputServerGroup'),
                    notAvailableOptions = selectElements.find('option[value="notAvailable"]');
                if (typeof data.supportsFeatures !== 'undefined') {
                    addonSupportsFeatures = data.supportsFeatures;
                    addonProvisioningType.find('div.radio').each(function() {
                        $(this).removeClass('radio-disabled').find('input').prop('disabled', false);
                    });
                }
                if (!addonSupportsFeatures) {
                    jQuery('input[name="atype"]').first().prop('checked', true);
                    addonProvisioningType.find('div.radio').each(function() {
                        $(this).addClass('radio-disabled').find('input').prop('disabled', true);
                    });
                    packageList.find('option').prop('disabled', false);
                    selectElements.removeClass('disabled').prop('disabled', false);
                    notAvailableOptions.remove();
                } else {
                    packageList.find('option').prop('disabled', true);
                    if (jQuery('input[name="atype"]:checked').val() === 'feature') {
                        selectElements.addClass('disabled').prop('disabled', true);
                        if (!notAvailableOptions.length) {
                            selectElements.prepend(
                                $('<option>').val('notAvailable')
                                    .text(data.languageStrings['notAvailableForStyle'])
                                    .attr('selected', 'selected')
                            );
                        }
                    }
                }
                packageList.bootstrapDualListbox('refresh', true);
            }
        } else {
            $('#noModuleSelectedRow').removeClass('hidden');
            $('#tblModuleAutomationSettings').find('input[type=radio]').attr('disabled', true);
        }
    }, "json")
    .always(function() {
        $('#moduleSettingsLoader').fadeOut();
        jQuery('[data-toggle="tooltip"]').tooltip();
        updateServerGroups(gotValidResponse ? module : '');

        if (!gotValidResponse) {
            // non json response, likely session expired
        }
        loadedModuleConfiguration = true;
    });
    return dataResponse;
}

function wizardCall(action, request, handler) {
    var requestString = 'wizard=' + $('input[name="wizard"]').val()
        + '&step=' + $('input[name="step"]').val()
        + '&token=' + $('input[name="token"]').val()
        + '&action=' + action
        + '&' + request;

    WHMCS.http.jqClient.post('wizard.php', requestString, handler);
}

function wizardError(errorMsg) {
    WHMCS.ui.effects.errorShake($('.modal-wizard .wizard-step:visible .info-alert:first')
        .html(errorMsg).removeClass('hidden').addClass('alert-danger'));
}

function wizardStepTransition(skipNextStep, skip) {
    var currentStepNumber = $('.modal-wizard .wizard-step:visible').data('step-number');
    if (skipNextStep) {
        increment = 2;
    } else {
        increment = 1;
    }
    var lastStep = $('.modal-wizard .wizard-step:visible');
    var nextStepNumber = currentStepNumber + increment;
    if ($('#wizardStep' + nextStepNumber).length) {
        trackWizardPageView(nextStepNumber)

        $('#wizardStep' + currentStepNumber).fadeOut('', function() {
            var newClass = 'completed';
            if (skip) {
                newClass = 'skipped';
                $('#wizardStepLabel' + currentStepNumber + ' i').removeClass('fa-check-circle').addClass('fa-minus-circle');
            } else {
                lastStep.find('.signup-frm').hide();
                lastStep.find('.signup-frm-success').removeClass('hidden');

                if (currentStepNumber == 3) {
                    lastStep.find('.signup-frm-success')
                        .append('<input type="hidden" id="ccGatewayFormSubmitted" name="ccGatewayFormSubmitted" value="1" />');
                } else if (currentStepNumber == 5) {
                    lastStep.find('.signup-frm-success')
                        .append('<input type="hidden" id="enomFormSubmitted" name="enomFormSubmitted" value="1" />');
                }

            }

            if (nextStepNumber > 0) {
                // Show the BACK button.
                if (!$('#btnWizardBack').is(':visible')) {
                    $('#btnWizardBack').hide().removeClass('hidden').fadeIn('slow');
                }
            } else {
                $('#btnWizardBack').fadeOut('slow');
                $('#btnWizardDoNotShow').fadeIn('slow');
                $('#btnWizardSkip').fadeOut('slow');
            }
            $('#wizardStepLabel' + currentStepNumber).removeClass('current').addClass(newClass);
            $('.modal-wizard .wizard-step:visible :input').attr('disabled', true);
            $('#wizardStep' + nextStepNumber + ' :input').removeAttr('disabled');
            $('#wizardStep' + nextStepNumber).fadeIn();
            $('#inputWizardStep').val(nextStepNumber);
            $('#wizardStepLabel' + nextStepNumber).addClass('current');
        });
        if (!$('#wizardStep' + (nextStepNumber + 1)).length) {
            $('#btnWizardSkip').fadeOut('slow');
            $('#btnWizardBack').fadeOut('slow');
            $('.modal-submit').html('Finish');
        }
    } else {
        // end of steps
        $('#modalAjax').modal('hide');
    }
}

function wizardStepBackTransition() {
    var currentStepNumber = $('.modal-wizard .wizard-step:visible').data('step-number');
    var previousStepNumber = parseInt(currentStepNumber) - 1;

    $('#wizardStep' + currentStepNumber).fadeOut('', function() {
        trackWizardPageView(previousStepNumber)

        if (previousStepNumber < 1) {
            $('#btnWizardBack').fadeOut('slow');
            $('#btnWizardDoNotShow').fadeIn('slow');
            $('#btnWizardSkip').addClass('hidden');
        }

        $('.modal-wizard .wizard-step:visible :input').attr('disabled', true);
        $('#wizardStep' + previousStepNumber + ' :input').removeAttr('disabled');
        $('#wizardStep' + previousStepNumber).fadeIn();
        $('#inputWizardStep').val(previousStepNumber);
        $('#wizardStepLabel' + previousStepNumber).addClass('current');
        $('#wizardStepLabel' + currentStepNumber).removeClass('current');
    });
}

function fadeoutLoaderAndAllowSubmission(modal) {
    modal.find('.loader').fadeOut();
    modal.find('.modal-submit').removeProp('disabled');
}

function openSetupWizard() {
    $('#modalFooterLeft').html('<a href="#" id="btnWizardSkip" class="btn btn-link pull-left hidden">Skip Step</a>' +
        '<a href="#" id="btnWizardDoNotShow" class="btn btn-link pull-left">Do not show this again</a>' +
        '</div>');
    $('#modalAjaxSubmit').before('<a href="#" id="btnWizardBack" class="btn btn-default hidden">Back</a>');
    openModal('wizard.php?wizard=GettingStarted', '', 'Getting Started Wizard', 'modal-lg', 'modal-wizard modal-setup-wizard', 'Next', '', '',true);
}

function addInvoicePayment() {
    addingPayment = true;
    jQuery('#modalDuplicateTransaction').modal('hide');

    var post = WHMCS.http.jqClient.post(
            WHMCS.adminUtils.getAdminRouteUrl('/billing/invoice/' + thisInvoiceId + '/add-payment'),
            jQuery('#addPayment').serialize()
        );

    post.done(function (data) {
        if (data.redirectUri) {
            window.location = data.redirectUri;
        }
    });
}

function cancelAddPayment() {
    jQuery('#paymentLoading').fadeOut('fast', function() {
        jQuery('#paymentText').fadeIn('fast');
        jQuery('#btnAddPayment').removeAttr('disabled');
    });
    jQuery('#modalDuplicateTransaction').modal('hide');
}

function openFeatureHighlights() {
    openModal('whatsnew.php?modal=1', '', 'What\'s new in Version ...', '', 'modal-feature-highlights', '', '', '', true);
}

/**
 * Submit the first form that exists within a given container.
 *
 * @param {string} containerId The ID name of the container
 */
function autoSubmitFormByContainer(containerId) {
    if (typeof noAutoSubmit === "undefined" || noAutoSubmit === false) {
        jQuery("#" + containerId).find("form:first").submit();
    }
}

/**
 * Sluggify a text string.
 */
function slugify(text) {
    var search =  "āæåãàáäâảẩấćčçđẽèéëêếēėęīįìíïîłńñœøōõòóöôốớơśšūùúüûưÿžźż·/_,:;–"; // contains Unicode dash
    var replace = "aaaaaaaaaaacccdeeeeeeeeeiiiiiilnnooooooooooossuuuuuuyzzz-------";

    for (var i = 0, l = search.length; i < l; i++) {
        text = text.replace(new RegExp(search.charAt(i), 'g'), replace.charAt(i));
    }

    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/&/g, '-and-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

function generateBootstrapSwitches()
{
    jQuery('.slide-toggle').bootstrapSwitch();
    jQuery('.slide-toggle-mini').bootstrapSwitch({
        size: 'mini'
    });
}

function submitForm(frmId, addTarget) {
    var formTarget = jQuery('#' + frmId);
    if (addTarget) {
        formTarget.attr('target', '_blank');
    } else {
        formTarget.removeAttr('target');
    }
    formTarget.submit();
}

function reverseCommissionConfirm(totalDue, remainingBalance) {
    var amountValue,
        form = jQuery('form#transactions'),
        formData = form.serializeArray();

    amountValue = formData.find(function (object) {
        return object['name'] === 'amount';
    }).value;
    if (!amountValue) {
        var transidValue = formData.find(function (object) {
            return object['name'] === 'transid';
        }).value;
        amountValue = jQuery('form#transactions select#transid option[value="' + transidValue + '"]').data('amount');
    }
    if ((remainingBalance + amountValue) < totalDue) {
        jQuery('#modalReverseAffiliateCommission').modal().show();
        return false;
    }
    jQuery(
        '<input>',
        {
            type: 'hidden',
            name: 'reverseCommission',
            value: 'true'
        }
    ).appendTo(form);
    form.removeAttr('onsubmit').submit();
}

function reverseCommissionSubmit(reverseCommission = false) {
    var form = jQuery('form#transactions');

    if (reverseCommission) {
        jQuery(
            '<input>',
            {
                type: 'hidden',
                name: 'reverseCommission',
                value: 'true'
            }
        ).appendTo(form);
    }
    form.removeAttr('onsubmit').submit();
}

function autosizeTextarea(el) {
    var init = function(el) {
        var elements = document.querySelectorAll(el)
        for (var i = 0; i < elements.length; i++) {
            elements[i].style.overflowX = "hidden"
            elements[i].style.height = calcHeight(elements[i])
            elements[i].addEventListener("input", onInput)
        }
    };

    var onInput = function() {
        this.style.height = "auto"
        this.style.height = calcHeight(this)
    };

    var calcHeight = function(el) {
        return (el.scrollHeight + parseFloat(jQuery(el).css("borderTopWidth")) + parseFloat(jQuery(el).css("borderBottomWidth"))) + "px"
    };

    init(el)
}

function calculateInvoiceTotal(invoiceId, invoiceItems) {
    return WHMCS.http.jqClient.post(
        WHMCS.adminUtils.getAdminRouteUrl('/invoice-total/calculate'),
        {
            invoiceId: invoiceId,
            items: invoiceItems,
            token: csrfToken
        }
    );
}

function destroyInvoiceItem(id) {
    return WHMCS.http.jqClient.post(
        WHMCS.adminUtils.getAdminRouteUrl('/invoice-item/destroy'),
        {
            invoiceItemId: id,
            token: csrfToken
        }
    );
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function getWizardStepPageData(stepNumber) {
    const stepPageMap = {
        1: {
            title: 'General',
            path: '/getting-started',
        },
        2: {
            title: 'Payments',
            path: '/getting-started/payments/step1',
        },
        3: {
            title: 'Domain',
            path: '/getting-started/domains/step1',
        },
        4: {
            title: 'eNom',
            path: '/getting-started/enom',
        },
        5: {
            title: 'Web Hosting',
            path: '/getting-started/hosting',
        },
        6: {
            title: 'Add-ons & Extras',
            path: '/getting-started/marketConnect/step1',
        },
        7: {
            title: 'Complete',
            path: '/getting-started/complete',
        }
    };

    return stepPageMap[stepNumber] || { title: 'Unknown step', path: '/getting-started/unknown' };
}

function isMixpanelEnabled() {
    return (typeof mixpanel_enabled !== 'undefined') && (mixpanel_enabled === true);
}

function trackWizardPageView(stepNumber, action = 'view') {
    if (!isMixpanelEnabled()) {
        return;
    }

    const stepPageData = getWizardStepPageData(stepNumber);

    const fullUrl = new URL(stepPageData.path, window.location.origin).toString();

    mixpanel.track_pageview({
        "page": `${stepPageData.title} (${action})`,
        "\$current_url": fullUrl,
        "\$referrer": fullUrl,
    });
}

/*!
 * WHMCS Ajax Driven Modal Framework
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2021
 * @license https://www.whmcs.com/license/ WHMCS Eula
 */
var ajaxModalSubmitEvents = [],
    ajaxModalPostSubmitEvents = [];
jQuery(document).ready(function(){
    jQuery(document).on('click', '.open-modal', function(e) {
        e.preventDefault();
        var url = jQuery(this).attr('href'),
            modalSize = jQuery(this).data('modal-size'),
            modalClass = jQuery(this).data('modal-class'),
            modalTitle = jQuery(this).data('modal-title'),
            submitId = jQuery(this).data('btn-submit-id'),
            submitLabel = jQuery(this).data('btn-submit-label'),
            submitColor = jQuery(this).data('btn-submit-color'),
            hideClose = jQuery(this).data('btn-close-hide'),
            disabled = jQuery(this).attr('disabled'),
            successDataTable = jQuery(this).data('datatable-reload-success');

        var postData = '';
        if (csrfToken) {
            postData = {token: csrfToken};
        }
        if (!disabled) {
            openModal(url, postData, modalTitle, modalSize, modalClass, submitLabel, submitId, submitColor, hideClose, successDataTable);
        }
    });

    // define modal close reset action
    jQuery('#modalAjax').on('hidden.bs.modal', function (e) {
        if (jQuery(this).hasClass('modal-feature-highlights')) {
            var dismissForVersion = jQuery('#cbFeatureHighlightsDismissForVersion').is(':checked');
            WHMCS.http.jqClient.post(
                'whatsnew.php',
                {
                    dismiss: "1",
                    until_next_update: dismissForVersion ? '1' : '0',
                    token: csrfToken
                }
            );
        }

        jQuery('#modalAjax').find('.modal-body').empty();
        jQuery('#modalAjax').children('div.modal-dialog').removeClass('modal-lg');
        jQuery('#modalAjax').removeClass().addClass('modal whmcs-modal fade');
        jQuery('#modalAjax .modal-title').html('Title');
        jQuery('#modalAjax .modal-submit').html('Submit')
            .removeClass()
            .addClass('btn btn-primary modal-submit')
            .removeAttr('id')
            .removeAttr('disabled');
        jQuery('#modalAjax .loader').show();
    });
});

function openModal(url, postData, modalTitle, modalSize, modalClass, submitLabel, submitId, submitColor, hideClose, successDataTable) {
    //set the text of the modal title
    jQuery('#modalAjax .modal-title').html(modalTitle);

    // set the modal size via a class attribute
    if (modalSize) {
        jQuery('#modalAjax').children('div[class="modal-dialog"]').addClass(modalSize);
    }
    // set the modal class
    if (modalClass) {
        jQuery('#modalAjax').addClass(modalClass);
    }

    // set the text of the submit button
    if(!submitLabel){
       jQuery('#modalAjax .modal-submit').hide();
    } else {
        jQuery('#modalAjax .modal-submit').show().html(submitLabel);
        // set the button id so we can target the click function of it.
        if (submitId) {
            jQuery('#modalAjax .modal-submit').attr('id', submitId);
        }
    }

    if (hideClose) {
        jQuery('#modalAjaxClose').hide();
    }

    if (submitColor) {
        jQuery('#modalAjax .modal-submit').removeClass('btn-primary')
            .addClass('btn-' + submitColor);
    }

    jQuery('#modalAjax .modal-body').html('');

    jQuery('#modalSkip').hide();
    disableSubmit();

    // show modal
    jQuery('#modalAjax').modal({
        show: true,
        keyboard: true,
        backdrop: jQuery('#modalAjax').hasClass('static') ? 'static' : true
    });

    // fetch modal content
    WHMCS.http.jqClient.post(url, postData, function(data) {
        updateAjaxModal(data);
    }, 'json').fail(function() {
        jQuery('#modalAjax .modal-body').html('An error occurred while communicating with the server. Please try again.');
        jQuery('#modalAjax .loader').fadeOut();
    }).always(function () {
        var modalForm = jQuery('#modalAjax').find('form');
        // If a submitId is present, then we're working with a form and need to override the default event
        if (submitId) {
            modalForm.submit(function (event) {
                submitIdAjaxModalClickEvent();
                return false;
            });
        }
        if (successDataTable) {
            modalForm.data('successDataTable', successDataTable);
        }

        // Since the content is dynamically fetched, we have to check for the elements we want here too
        var inputs = jQuery(modalForm).find('input:not(input[type=checkbox],input[type=radio],input[type=hidden])');

        if (inputs.length > 0) {
            jQuery(inputs).first().focus();
        }
    });

    //define modal submit button click
    if (submitId) {
        /**
         * Reloading ajax modal multiple times on the same page can add
         * multiple "on" click events which submits the same form over
         * and over.
         * Remove the on click event with "off" to avoid multiple growl
         * and save events being run.
         *
         * @see http://api.jquery.com/off/
         */
        var submitButton = jQuery('#' + submitId);
        submitButton.off('click');
        submitButton.on('click', submitIdAjaxModalClickEvent);
    }
}

function submitIdAjaxModalClickEvent ()
{
    var canContinue = true,
        loader = jQuery('#modalAjax .loader');
    disableSubmit();
    loader.show();
    if (ajaxModalSubmitEvents.length) {
        jQuery.each(ajaxModalSubmitEvents, function (index, value) {
            var fn = window[value];
            if (canContinue && typeof fn === 'function') {
                canContinue = fn();
            }
        });
    }
    if (!canContinue) {
        enableSubmit();
        loader.hide();
        return;
    }
    var modalForm = jQuery('#modalAjax').find('form');
    var modalBody = jQuery('#modalAjax .modal-body');
    var modalErrorContainer = jQuery(modalBody).find('.admin-modal-error');

    jQuery(modalErrorContainer).slideUp();

    var modalPost = WHMCS.http.jqClient.post(
        modalForm.attr('action'),
        modalForm.serialize(),
        function(data) {
            if (modalForm.data('successDataTable')) {
                data.successDataTable = modalForm.data('successDataTable');
            }
            /**
             * When actions should occur before the ajax modal is updated
             * that do not fall into the standard actions.
             * Calling code (ie the function defined in fn) should validate
             * that the ajax modal being updated is the one that the code should
             * run for, as there is potential for multiple ajax modals on the
             * same page.
             */
            if (ajaxModalPostSubmitEvents.length) {
                jQuery.each(ajaxModalPostSubmitEvents, function (index, value) {
                    var fn = window[value];
                    if (typeof fn === 'function') {
                        fn(data, modalForm);
                    }
                });
            }
            updateAjaxModal(data);
        },
        'json'
    ).fail(function(xhr) {
        var data = xhr.responseJSON;
        var genericErrorMsg = 'An error occurred while communicating with the server. Please try again.';
        if (data && data.data) {
            data = data.data;
            if (data.errorMsg) {
                if (modalErrorContainer.length > 0) {
                    jQuery(modalErrorContainer)
                        .html(data.errorMsg)
                        .slideDown();
                } else {
                    jQuery.growl.warning({title: data.errorMsgTitle, message: data.errorMsg});
                }
            } else if (data.data.body) {
                jQuery(modalBody).html(data.body);
            } else {
                jQuery(modalBody).html(genericErrorMsg);
            }
        } else {
            jQuery(modalBody).html(genericErrorMsg);
        }
        jQuery('#modalAjax .loader').fadeOut();
        enableSubmit();
    });
}

function updateAjaxModal(data) {
    if (data.reloadPage) {
        if (typeof data.reloadPage === 'string') {
            window.location = data.reloadPage;
        } else {
            window.location.reload();
        }
        return;
    }
    if (data.successDataTable) {
        WHMCS.ui.dataTable.getTableById(data.successDataTable, undefined).ajax.reload();
    }
    if (data.redirect) {
        window.location = data.redirect;
    }
    if (data.successWindow && typeof window[data.successWindow] === "function") {
        window[data.successWindow]();
    }
    if (data.dismiss) {
        dialogClose();
    }
    if (data.successMsg) {
        jQuery.growl.notice({ title: data.successMsgTitle, message: data.successMsg });
    }
    if (data.errorMsg) {
        var inModalErrorContainer = jQuery('#modalAjax .modal-body .admin-modal-error');

        if (inModalErrorContainer.length > 0 && !data.dismiss) {
            jQuery(inModalErrorContainer)
                .html(data.errorMsg)
                .slideDown();
        } else {
            jQuery.growl.warning({title: data.errorMsgTitle, message: data.errorMsg});
        }
    }
    if (data.title) {
        jQuery('#modalAjax .modal-title').html(data.title);
    }
    if (data.body) {
        jQuery('#modalAjax .modal-body').html(data.body);
    } else {
        if (data.url) {
            WHMCS.http.jqClient.post(data.url, '', function(data2) {
                jQuery('#modalAjax').find('.modal-body').html(data2.body);
            }, 'json').fail(function() {
                jQuery('#modalAjax').find('.modal-body').html('An error occurred while communicating with the server. Please try again.');
                jQuery('#modalAjax').find('.loader').fadeOut();
            });
        }
    }
    if (data.submitlabel) {
        jQuery('#modalAjax .modal-submit').html(data.submitlabel).show();
        if (data.submitId) {
            jQuery('#modalAjax').find('.modal-submit').attr('id', data.submitId);
        }
    }

    if (data.submitId) {
        /**
         * Reloading ajax modal multiple times on the same page can add
         * multiple "on" click events which submits the same form over
         * and over.
         * Remove the on click event with "off" to avoid multiple growl
         * and save events being run.
         *
         * @see http://api.jquery.com/off/
         */
        var submitButton = jQuery('#' + data.submitId);
        submitButton.off('click');
        submitButton.on('click', submitIdAjaxModalClickEvent);
    }

    if (data.disableSubmit) {
        disableSubmit();
    } else {
        enableSubmit();
    }

    var dismissLoader = true;
    if (typeof data.dismissLoader !== 'undefined') {
        dismissLoader = data.dismissLoader;
    }

    dismissLoaderAfterRender(dismissLoader);

    if (data.hideSubmit) {
        ajaxModalHideSubmit();
    }
}

// backwards compat for older dialog implementations

function dialogSubmit() {
    disableSubmit();
    jQuery('#modalAjax .loader').show();
    var postUrl = jQuery('#modalAjax').find('form').attr('action');
    WHMCS.http.jqClient.post(postUrl, jQuery('#modalAjax').find('form').serialize(),
        function(data) {
            updateAjaxModal(data);
        }, 'json').fail(function() {
            jQuery('#modalAjax .modal-body').html('An error occurred while communicating with the server. Please try again.');
            jQuery('#modalAjax .loader').fadeOut();
        });
}

function dialogClose() {
    jQuery('#modalAjax').modal('hide');
}

function addAjaxModalSubmitEvents(functionName) {
    if (functionName) {
        ajaxModalSubmitEvents.push(functionName);
    }
}

function removeAjaxModalSubmitEvents(functionName) {
    if (functionName) {
        var index = ajaxModalSubmitEvents.indexOf(functionName);
        if (index >= 0) {
            ajaxModalSubmitEvents.splice(index, 1);
        }
    }
}

function addAjaxModalPostSubmitEvents(functionName) {
    if (functionName) {
        ajaxModalPostSubmitEvents.push(functionName);
    }
}

function removeAjaxModalPostSubmitEvents(functionName) {
    if (functionName) {
        var index = ajaxModalPostSubmitEvents.indexOf(functionName);
        if (index >= 0) {
            ajaxModalPostSubmitEvents.splice(index, 1);
        }
    }
}

function disableSubmit()
{
    jQuery('#modalAjax .modal-submit').prop('disabled', true).addClass('disabled');
}

function enableSubmit()
{
    jQuery('#modalAjax .modal-submit').prop('disabled', false).removeClass('disabled');
}

function ajaxModalHideSubmit()
{
    jQuery('#modalAjax .modal-submit').hide();
}

function dismissLoaderAfterRender(showLoader)
{
    if (showLoader === false) {
        jQuery('#modalAjax .loader').show();
    } else {
        jQuery('#modalAjax .loader').fadeOut();
    }
}

/*!
 * WHMCS Dynamic Dropdown Library
 *
 * Based upon Selectize.js
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2016
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */

jQuery(document).ready(
    function()
    {
        var multiSelectize = jQuery('.selectize-multi-select'),
            standardSelectize = jQuery('.selectize-select'),
            promoSelectize = jQuery('.selectize-promo'),
            tags = jQuery('.selectize-tags'),
            newTicketCC = jQuery('.selectize-newTicketCc,.selectize-ticketCc');

        jQuery(multiSelectize).selectize(
            {
                plugins: ['remove_button'],
                valueField: jQuery(multiSelectize).attr('data-value-field'),
                labelField: 'name',
                searchField: 'name',
                allowEmptyOption: true,
                create: false,
                maxItems: null,
                render: {
                    item: function(item, escape) {
                        return '<div><span class="name">' + escape(item.name) + '</span></div>';
                    },
                    option: function(item, escape) {
                        return '<div><span class="name">' + escape(item.name) + '</span></div>';
                    }
                },
                onItemRemove: function(value) {
                    if (jQuery(this)[0].$input[0].id == 'multi-view' && value != 'any' && value != 'flagged') {
                        jQuery(this)[0].removeItem('any', true);
                    }
                }
            }
        );

        jQuery(standardSelectize).selectize(
            {
                valueField: jQuery(standardSelectize).attr('data-value-field'),
                labelField: 'name',
                searchField: 'name',
                allowEmptyOption: jQuery(standardSelectize).attr('data-allow-empty-option'),
                create: false,
                maxItems: 1,
                render: {
                    item: function(item, escape) {
                        var colour = '';
                        if (typeof item.colour !== 'undefined' && item.colour !== '#FFF') {
                            colour = ' style="background-color: ' + escape(item.colour) + ';"';
                        }
                        return '<div' + colour + '><span class="name">' + escape(item.name) + '</span></div>';
                    },
                    option: function(item, escape) {
                        var colour = '';
                        if (typeof item.colour !== 'undefined' && item.colour !== '#FFF') {
                            colour = ' style="background-color: ' + escape(item.colour) + ';"';
                        }
                        return '<div' + colour + '><span class="name">' + escape(item.name) + '</span></div>';
                    }
                },
                onInitialize: function () {
                    this.currentValue = '';
                },
                onFocus: function() {
                    this.currentValue = this.getValue();
                    this.clear();
                },
                onChange: function() {
                    if (this.getValue() === '') {
                        return;
                    }

                    if (this.currentValue === this.getValue()) {
                        return;
                    }

                    this.currentValue = this.getValue();

                    if (jQuery(standardSelectize).hasClass('selectize-auto-submit')) {
                        jQuery(standardSelectize).parent('form').submit();
                    }
                },
                onBlur: function() {
                    this.setValue(this.currentValue);
                }
            }
        );

        jQuery(promoSelectize).selectize(
            {
                valueField: jQuery(promoSelectize).attr('data-value-field'),
                labelField: 'name',
                searchField: 'name',
                allowEmptyOption: jQuery(promoSelectize).attr('data-allow-empty-option'),
                create: false,
                maxItems: 1,
                render: {
                    item: function(item, escape) {
                        var colour = '';
                        var promo = item.name.split(' - ');
                        if (typeof item.colour !== 'undefined' && item.colour !== '#FFF' && item.colour !== '') {
                            colour = ' style="background-color: ' + escape(item.colour) + ';"';
                        }
                        if (typeof otherPromos !== 'undefined'
                            && item.optgroup === otherPromos
                            && this.currentValue !== ''
                        ) {
                            jQuery('#nonApplicablePromoWarning').show();
                        } else {
                            jQuery('#nonApplicablePromoWarning').hide();
                        }
                        if (promo[1]) {
                            return '<div' + colour + '>'
                                + '<strong>' + escape(promo[0]) + '</strong>'
                                + '<small style="overflow: hidden"> - ' + escape(promo[1]) + '</small>'
                                + '</div>';
                        } else {
                            return '<div' + colour + '>'
                                + escape(promo[0])
                                + '</div>';
                        }
                    },
                    option: function(item, escape) {
                        var colour = '';
                        var promo = item.name.split(' - ');
                        if (typeof item.colour !== 'undefined' && item.colour !== '#FFF' && item.colour !== '') {
                            colour = ' style="background-color: ' + escape(item.colour) + ';"';
                        }
                        if (promo[1]) {
                            return '<div' + colour + '>'
                                + '<strong>' + escape(promo[0]) + '</strong><br />'
                                + escape(promo[1])
                                + '</div>';
                        } else {
                            return '<div' + colour + '>'
                                + escape(promo[0])
                                + '</div>';
                        }
                    }
                },
                onInitialize: function () {
                    this.currentValue = '';
                },
                onFocus: function() {
                    this.$control.parent('div').css('overflow', 'visible');
                    this.currentValue = this.getValue();
                    this.clear();
                },
                onChange: function() {
                    if (this.getValue() === '') {
                        return;
                    }

                    if (this.currentValue === this.getValue()) {
                        return;
                    }

                    this.currentValue = this.getValue();

                    if (jQuery(promoSelectize).hasClass('selectize-auto-submit')) {
                        jQuery(promoSelectize).parent('form').submit();
                    }
                },
                onBlur: function() {
                    this.$control.parent('div').css('overflow', 'hidden');
                    this.setValue(this.currentValue);
                }
            }
        );

        jQuery(tags).selectize(
            {
                plugins: ['remove_button'],
                valueField: 'text',
                searchField: ['text'],
                delimiter: ',',
                persist: false,
                create: function(input) {
                    return {
                        value: input,
                        text: input
                    }
                },
                render: {
                    item: function(item, escape) {
                        return '<div><span class="item">' + escape(item.text) + '</span></div>';
                    },
                    option: function(item, escape) {
                        return '<div><span class="item">' + escape(item.text) + '</span></div>';
                    }
                },
                load: function(query, callback) {
                    if (!query.length) return callback();
                    jQuery.ajax({
                        url: window.location.href,
                        type: 'POST',
                        dataType: 'json',
                        data: {
                            action: 'gettags',
                            q: query,
                            token: csrfToken
                        },
                        error: function() {
                            callback();
                        },
                        success: function(res) {
                            callback(res);
                        }
                    });
                },
                onItemAdd: function (value)
                {
                    jQuery.ajax({
                        url: window.location.href,
                        type: 'POST',
                        data: {
                            action: 'addTag',
                            newTag: value,
                            token: csrfToken
                        }
                    }).success(function() {
                        jQuery.growl.notice({ title: "", message: "Saved successfully!" });
                    });
                },
                onItemRemove: function(value)
                {
                    jQuery.ajax({
                        url: window.location.href,
                        type: 'POST',
                        data: {
                            action: 'removeTag',
                            removeTag: value,
                            token: csrfToken
                        }
                    }).success(function() {
                        jQuery.growl.notice({ title: "", message: "Saved successfully!" });
                    });
                }
            }
        );

        jQuery(newTicketCC).selectize(
            {
                plugins: ['remove_button'],
                valueField: 'text',
                searchField: ['text'],
                delimiter: ',',
                persist: true,
                create: function(input) {
                    input = input.toLowerCase();
                    return {
                        value: input,
                        text: input,
                        name: input,
                        iconclass: ''
                    }
                },
                render: {
                    item: function(item, escape) {
                        var name = '';
                        if (typeof item.iconclass !== 'undefined' && item.iconclass.length > 0) {
                            name = '<span style="padding-right: 8px"><i class="' + escape(item.iconclass) + '"></i></span>'
                            + escape(item.name);
                        } else {
                            name = escape(item.name);
                        }
                        return '<div class="selectize">'
                            + '<span class="name">' + name + '</span>'
                            + '</div>';
                    },
                    option: function(item, escape) {
                        var name = '';
                        if (typeof item.iconclass !== 'undefined' && item.iconclass.length > 0) {
                            name = '<span style="padding-right: 8px"><i class="' + escape(item.iconclass) + '"></i></span>'
                                + escape(item.name);
                        } else {
                            name = escape(item.name);
                        }
                        return '<div class="selectize">'
                            + '<span class="name">' + name + '</span>'
                            + '<span class="email">' + escape(item.text) + '</span>'
                            + '</div>';
                    }
                }
            }
        );
    }
);

$(document).ready(function(){
    var minimisedWidgets = null;
    if(typeof(Storage) !== "undefined") {
        minimisedWidgets = JSON.parse(localStorage.getItem("minimisedWidgets"));
    }
    if (!minimisedWidgets) {
        minimisedWidgets = [];
    }
    $(".widget-minimise").click(function(e) {
        e.preventDefault();
        var obj = $(this);
        var icon = obj.find('i'),
            widget = obj.closest('.panel').data('widget');
        if (icon.hasClass('fa-chevron-up')) {
            obj.closest('.panel').find('.panel-body').slideUp('fast', function() {
                icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
                packery.shiftLayout();
            });
            if (minimisedWidgets.indexOf(widget) == -1) {
                minimisedWidgets.push(widget);
            }
        } else {
            obj.closest('.panel').find('.panel-body').slideDown('fast', function(e) {
                icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                packery.fit(this);
                packery.shiftLayout();
            });
            minimisedWidgets.splice(minimisedWidgets.indexOf(widget), 1);
        }
        if(typeof(Storage) !== "undefined") {
            localStorage.setItem("minimisedWidgets", JSON.stringify(minimisedWidgets));
        }
    });
    $(".widget-refresh").click(function(e) {
        e.preventDefault();
        var obj = $(this);
        var icon = obj.find('i');
        var widget = obj.closest('.panel').data('widget');
        var panelBody = obj.closest('.panel').find('.panel-body');
        icon.addClass('fa-spin');
        refreshWidget(widget, 'refresh=1');
    });
    var completedToggle = false;
    $(".widget-hide").click(function(e) {
        e.preventDefault();
        var obj = $(this),
            widget = obj.closest('.panel').data('widget');
        completedToggle = true;

        $('#panel' + widget).slideUp('fast', function() {
            $(this).addClass('hidden');
            WHMCS.http.jqClient.post(WHMCS.adminUtils.getAdminRouteUrl('/widget/display/toggle/' + widget)).always(function() {
                $('input[data-widget="' + widget + '"]').iCheck('uncheck');
                completedToggle = false;
            });
            $('.home-widgets-container').masonry().masonry('reloadItems');
        });
    });

    $(document).on('ifToggled', '.display-widget', function(event) {
        var self = $(this),
            widget = $(this).data('widget'),
            widgetPanel = $('#panel' + widget);

        if (completedToggle) {
            return;
        }

        self.iCheck('disable');
        if (self.prop('checked')) {
            if (widgetPanel.hasClass('hidden')) {
                self.parent('div').parent('label').parent('li').addClass('active');
                widgetPanel.hide().removeClass('hidden').slideDown('fast', function() {
                    WHMCS.http.jqClient.post(WHMCS.adminUtils.getAdminRouteUrl('/widget/display/toggle/' + widget))
                    .always(function() {
                        $('.home-widgets-container').masonry().masonry('reloadItems');
                        widgetPanel.find('.widget-refresh').click();
                        if ($('#widgetSettingsDropdown').hasClass('open') === false) {
                            $('#widgetSettings').dropdown('toggle');
                        }
                        self.iCheck('enable');
                    });
                });
            }
        } else {
            if (widgetPanel.hasClass('hidden') === false) {
                self.parent('div').parent('label').parent('li').removeClass('active');
                widgetPanel.slideUp('fast', function() {
                    $(this).addClass('hidden');
                    $('.home-widgets-container').masonry().masonry('reloadItems');
                    WHMCS.http.jqClient.post(WHMCS.adminUtils.getAdminRouteUrl('/widget/display/toggle/' + widget), function() {
                        if ($('#widgetSettingsDropdown').hasClass('open') === false) {
                            $('#widgetSettings').dropdown('toggle');
                        }
                    }, 'json').always(function() {
                        self.iCheck('enable');
                    });
                });
            }
        }
    });

    $('input.display-widget').each(function(){
        var self = $(this),
            label = self.next(),
            label_text = label.text();

        label.remove();
        self.iCheck({
            inheritID: true,
            checkboxClass: 'icheckbox_flat-blue',
            increaseArea: '20%'
        });
    });

    if ($('.home-widgets-container').length) {
        minimisedWidgets.forEach(function(currentValue) {
            $('#panel' + currentValue).find('.panel-body').hide().end()
                .find('i.fa-chevron-up').removeClass('fa-chevron-up').addClass('fa-chevron-down');
        });

        Packery.prototype.getPositions = function() {
            return this.items.map(function(item) {
                return item.element.getAttribute("data-widget")
            });
        };

        // init Packery
        grid = document.querySelector('.home-widgets-container'),
        packery = new Packery(grid, {
            itemSelector: '.dashboard-panel-item',
            columnWidth: '.dashboard-panel-sizer',
            percentPosition: true
        });

        packery.stamp(document.querySelector('.dashboard-panel-static-item'));

        // init draggable
        var items = grid.querySelectorAll('.dashboard-panel-item');
        for (var i=0; i < items.length; i++) {
            var itemElem = items[i],
                draggie = new Draggabilly(itemElem, {handle: '.panel-title'} );
            packery.bindDraggabillyEvents(draggie);
        }

        // Listeners

        packery.on('removeComplete', function() {
            packery.shiftLayout();
        });

        var isSaving = false;
        packery.on('dragItemPositioned', function(items) {
            packery.shiftLayout();
            if (!$(".home-widgets-container").children("div.dashboard-panel-item").hasClass('is-dragging')){
                if (!isSaving) {
                    isSaving = true;
                    setTimeout(function () {
                        saveWidgetPosition();
                    }, 1000);
                }
            }
        });
    }

    function saveWidgetPosition() {
        WHMCS.http.jqClient.post(WHMCS.adminUtils.getAdminRouteUrl('/widget/order'),
            {
                token: csrfToken,
                order: packery.getPositions()
            },
            function(data) {
                //do nothing
            },
            'json'
        ).always(function() {
            isSaving = false;
            packery.shiftLayout();
        });
    }

    jQuery('.admin-dashboard-carousel button.close').on(
        'click',
        dismissAdminDashboardCarouselItem
    );
    jQuery(window).on(
        'load resize orientationchange',
        normalizeAdminDashboardCarouselContent
    );
    function normalizeAdminDashboardCarouselContent() {
        let carouselContent = jQuery('.admin-dashboard-carousel .promotion-content');
        carouselContent.css('min-height', 0);
        let maxHeight = Math.max
            .apply(
                null,
                carouselContent.map(getCarouselItemOuterHeight).get()
            );
        carouselContent.css('min-height', maxHeight + 'px');
    }
    function getCarouselItemOuterHeight() {
        let element = jQuery(this);
        let item = element.closest('.item');
        let outerHeight = 0;
        if (item.hasClass('active')) {
            return element.outerHeight();
        }
        item.addClass('active');
        outerHeight = element.outerHeight();
        item.removeClass('active');
        return outerHeight;
    }
    function removeAdminDashboardSpecificPromotion(carousel, identifier) {
        let carouselItems = carousel.find('.item');
        let carouselIndicators = carousel.find('.carousel-indicators li');
        let targetIndex = 0;
        carouselItems.removeClass('active');
        carouselItems.each(function(index, item) {
            if (jQuery(item).find('[data-identifier="' + identifier + '"]').length > 0) {
                let nextIndex = parseInt(index) + 1;
                if (nextIndex >= carouselItems.length) {
                    nextIndex = 0;
                }
                targetIndex = nextIndex;
                jQuery(item).remove();
                jQuery(carouselItems[nextIndex]).addClass('active');
            }
        });
        if (carouselItems.length <= 2) {
            jQuery('.admin-dashboard-carousel-controls').remove();
            return false;
        }
        if (targetIndex !== 0) {
            targetIndex--;
        }
        carouselIndicators.removeClass('active');
        carouselIndicators.each(function(index, indicator) {
            if (index === targetIndex) {
                jQuery(indicator).addClass('active');
            }
        });
        carouselIndicators.last().remove();
    }
    function dismissAdminDashboardCarouselItem() {
        let identifier = jQuery(this).closest('.alert')
            .data('identifier');
        let carousel = jQuery('.admin-dashboard-carousel');
        if (carousel.find('.item').length <= 1) {
            carousel.remove();
        } else {
            removeAdminDashboardSpecificPromotion(carousel, identifier);
        }
        WHMCS.http.jqClient.post(
            WHMCS.adminUtils.getAdminRouteUrl('/promotions/dismiss/' + identifier),
            {
                token: csrfToken,
            }
        );
    }

    //end of $(document).ready
});

var grid, packery;

function refreshWidget(widgetName, requestString) {
    var obj = $('.panel[data-widget="' + widgetName + '"]');
    var panelBody = obj.find('.panel-body');
    var icon = obj.find('i.fa-sync');
    panelBody.addClass('panel-loading');
    var jqxhr = WHMCS.http.jqClient.post(WHMCS.adminUtils.getAdminRouteUrl('/widget/refresh&widget=' + widgetName + '&' + requestString),
        function(data) {
            panelBody.html(data.widgetOutput);
            panelBody.removeClass('panel-loading');
        }, 'json')
        .always(function() {
            icon.removeClass('fa-spin');
        });
}

/*!
 * Automation Status Javascript.
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2019
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */
$(document).ready(function(){
    $('#statsContainer').on('click', '.btn-viewing', function (e){
        e.preventDefault();
    });
    $('#graphContainer').on('click', '.graph-filter-metric a', function (e){
        e.preventDefault();
        $('.graph-filter-metric a').removeClass('active');
        $(this).addClass('active');
        refreshGraph();
    });
    $('#graphContainer').on('click', '.graph-filter-period a', function (e){
        e.preventDefault();
        $('.graph-filter-period a').removeClass('active');
        $(this).addClass('active');
        refreshGraph();
    });
});

function loadAutomationStatsForDate(date) {
    $('#statsContainer').css('opacity', '0.5');
        WHMCS.http.jqClient.post(
            "automationstatus.php",
            'action=stats&date=' + date,
            function(data) {
                $('.widgets-container').html(data.body);
                $('.day-selector').find('.btn-viewing').html(data.newDate);
            }
        ).fail(function() {
            jQuery.growl({ title: "", message: "Your session has expired. Please refresh to continue." });
        }).always(function() {
            $('#statsContainer').css('opacity', '1');
        });
}

function refreshGraph() {
    $('#graphContainer').css('opacity', '0.5');
        var jqxhr = WHMCS.http.jqClient.post( "automationstatus.php",'action=graph&metric=' + $('.graph-filter-metric a.active').attr('href') + '&period=' + $('.graph-filter-period a.active').attr('href'),
            function(data) {
                $('#graphContainer').html(data.body);
            }).fail(function() {
                jQuery.growl({ title: "", message: "Your session has expired. Please refresh to continue." });
            }).always(function() {
                $('#graphContainer').css('opacity', '1');
            });
}

jQuery(document).ready(function() {
    var backupsContainer = jQuery('.database-backups');

    backupsContainer.find('.activate').on('click', function() {
        var self = jQuery(this),
            form = self.parent('form'),
            type = self.data('type'),
            request = form.serialize();

        self.prop('disabled', true).addClass('disabled');

        request += '&action=save&activate=1&type=' + type + '&token=' + csrfToken;
        WHMCS.http.jqClient.post(
            window.location.href,
            request,
            function(data) {
                if (data.success === true) {
                    jQuery.growl.notice(
                        {
                            title: data.successMessageTitle,
                            message: data.successMessage
                        }
                    );
                    form.find('.save, .deactivate-start').removeClass('hidden');
                    self.addClass('hidden');
                    jQuery('#' + type + 'Label').toggleClass('label-default label-success').text(data.activeText);
                } else {
                    jQuery.growl.error(
                        {
                            title: data.errorMessageTitle,
                            message: data.errorMessage
                        }
                    );
                }
            },
            'json'
        ).always(function() {
            self.prop('disabled', false).removeClass('disabled');
        });
    });

    backupsContainer.find('.save').on('click', function() {
        var self = jQuery(this),
            form = self.parent('form'),
            type = self.data('type'),
            request = form.serialize();


        self.prop('disabled', true).addClass('disabled');

        request += '&action=save&type=' + type + '&token=' + csrfToken;
        WHMCS.http.jqClient.post(
            window.location.href,
            request,
            function(data) {
                if (data.success === true) {
                    jQuery.growl.notice(
                        {
                            title: data.successMessageTitle,
                            message: data.successMessage
                        }
                    );
                } else {
                    jQuery.growl.error(
                        {
                            title: data.errorMessageTitle,
                            message: data.errorMessage
                        }
                    );
                }
            },
            'json'
        ).always(function() {
            self.prop('disabled', false).removeClass('disabled');
        });
    });

    backupsContainer.find('.test').on('click', function() {
        var self = jQuery(this),
            form = self.parent('form'),
            type = self.data('type'),
            request = form.serialize();

        self.prop('disabled', true).addClass('disabled');
        jQuery('#' + type + 'Container').removeClass('hidden');
        request += '&action=test&type=' + type + '&token=' + csrfToken;
        jQuery('#' + type + 'Test').hide()
            .removeClass('hidden alert-success alert-danger')
            .addClass('alert-default')
            .find('.extra-text').addClass('hidden').text('').end()
            .find('.default-text').removeClass('hidden').end()
            .slideDown('fast');
        WHMCS.http.jqClient.post(
            window.location.href,
            request,
            function(data) {
                if (data.success === true) {
                    jQuery('#' + type + 'Test')
                        .addClass('alert-success')
                        .removeClass('alert-default alert-danger')
                        .find('.default-text').addClass('hidden').end()
                        .find('.extra-text').text(data.successMessage).removeClass('hidden').end()
                        .delay(3000).slideUp('slow');
                    form.find('.activate').prop('disabled', false).removeClass('disabled');
                } else {
                    jQuery('#' + type + 'Test')
                        .addClass('alert-danger')
                        .removeClass('alert-default alert-success')
                        .find('.default-text').addClass('hidden').end()
                        .find('.extra-text').text(data.errorMessageTitle + ': ' + data.errorMessage).removeClass('hidden').end()
                        .delay(3000).slideUp('slow');
                }
            },
            'json'
        ).always(function() {
            self.prop('disabled', false).removeClass('disabled');
            jQuery('#' + type + 'Container').addClass('hidden');
        });

    });

    backupsContainer.find('.deactivate-start').on('click', function() {
        var self = jQuery(this),
            form = self.parent('form'),
            type = self.data('type'),
            modal = jQuery('#modalConfirmDeactivate');


        jQuery('#confirmDeactivateYes').data('type', type);
        modal.modal('show');
    });

    jQuery('#modalConfirmDeactivate').find('.deactivate').on('click', function() {
        var self = jQuery(this),
            modal = jQuery('#modalConfirmDeactivate'),
            form = modal.parent('form'),
            type = self.data('type'),
            request = 'action=deactivate&type=' + type + '&token=' + csrfToken,
            mainForm = jQuery('.deactivate-start[data-type="' + type + '"]').parent('form');

        self.prop('disabled', true).addClass('disabled');

        WHMCS.http.jqClient.post(
            window.location.href,
            request,
            function(data) {
                if (data.success === true) {
                    jQuery.growl.notice(
                        {
                            title: data.successMessageTitle,
                            message: data.successMessage
                        }
                    );
                    mainForm.find('.save, .deactivate-start').addClass('hidden');
                    mainForm.find('.activate').removeClass('hidden').prop('disabled', true);
                    if (type === 'email') {
                        mainForm.find('.activate').prop('disabled', false);
                    }
                    jQuery('#' + type + 'Label').toggleClass('label-default label-success').text(data.inactiveText);
                } else {
                    jQuery.growl.error(
                        {
                            title: data.errorMessageTitle,
                            message: data.errorMessage
                        }
                    );
                }
            },
            'json'
        ).always(function() {
            self.prop('disabled', false).removeClass('disabled');
            modal.modal('hide');
        });
    });

    backupsContainer.find('#inputDestination').on('change', function() {
        var destinationData = jQuery('#destinationData'),
            value = jQuery(this).val();

        if (value !== 'homedir' && destinationData.hasClass('hidden')) {
            destinationData.hide().removeClass('hidden').slideDown('fast');
        } else if (value === 'homedir' && !(destinationData.hasClass('hidden'))) {
            destinationData.slideUp('fast').addClass('hidden');
        }
    });
});

/*!
 * DateRangePicker Javascript.
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2019
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */
function initDateRangePicker()
{
    jQuery(document).ready(function () {
        // Date range picker.

        jQuery('.date-picker-search').each(function (index) {
            var self = jQuery(this),
                opens = self.data('opens'),
                drops = self.data('drops'),
                range = adminJsVars.dateRangePicker.defaultRanges,
                format = adminJsVars.dateRangeFormat;
            if (!opens || typeof opens === "undefined") {
                opens = 'center';
            }
            if (!drops || typeof drops === "undefined") {
                drops = 'down';
            }
            if (self.hasClass('future')) {
                range = adminJsVars.dateRangePicker.futureRanges;
            }
            self.daterangepicker({
                autoUpdateInput: false,
                ranges: range,
                alwaysShowCalendars: true,
                opens: opens,
                drops: drops,
                showDropdowns: true,
                minYear: adminJsVars.minYear,
                maxYear: adminJsVars.maxYear,
                locale: {
                    format: format,
                    applyLabel: adminJsVars.dateRangePicker.applyLabel,
                    cancelLabel: adminJsVars.dateRangePicker.cancelLabel,
                    customRangeLabel: adminJsVars.dateRangePicker.customRangeLabel,
                    monthNames: adminJsVars.dateRangePicker.months,
                    daysOfWeek: adminJsVars.dateRangePicker.daysOfWeek
                }
            }).on('show.daterangepicker', function (ev, picker) {
                // Identify the date picker modal using the input ID if available.
                if (picker.element[0].id != '') {
                    picker.container[0].id = 'dateRangePicker_' + picker.element[0].id;
                }
            }).on('apply.daterangepicker', function (ev, picker) {
                jQuery(this).val(picker.startDate.format(adminJsVars.dateRangeFormat)
                    + ' - ' + picker.endDate.format(adminJsVars.dateRangeFormat));
            }).on('cancel.daterangepicker', function (ev, picker) {
                jQuery(this).val('');
            });
        });

        jQuery('.datepick,.date-picker,.date-picker-single').each(function (index) {
            var self = jQuery(this),
                opens = self.data('opens'),
                drops = self.data('drops'),
                range = adminJsVars.dateRangePicker.defaultSingleRanges,
                format = adminJsVars.dateRangeFormat,
                time = false;
            if (!opens || typeof opens === "undefined") {
                opens = 'center';
            }
            if (!drops || typeof drops === "undefined") {
                drops = 'down';
            }
            if (self.hasClass('future')) {
                range = adminJsVars.dateRangePicker.futureSingleRanges;
            }
            if (self.hasClass('time')) {
                time = true;
                format = adminJsVars.dateTimeRangeFormat;
                if (self.hasClass('future')) {
                    range = adminJsVars.dateRangePicker.futureTimeSingleRanges;
                }
            }

            self.daterangepicker({
                singleDatePicker: true,
                autoUpdateInput: false,
                ranges: range,
                alwaysShowCalendars: true,
                opens: opens,
                drops: drops,
                showDropdowns: true,
                minYear: adminJsVars.minYear,
                maxYear: adminJsVars.maxYear,
                timePicker: time,
                timePickerSeconds: false,
                locale: {
                    format: format,
                    customRangeLabel: adminJsVars.dateRangePicker.customRangeLabel,
                    monthNames: adminJsVars.dateRangePicker.months,
                    daysOfWeek: adminJsVars.dateRangePicker.daysOfWeek
                }
            }).on('show.daterangepicker', function (ev, picker) {
                // Identify the date picker modal using the input ID if available.
                if (picker.element[0].id != '') {
                    picker.container[0].id = 'dateRangePicker_' + picker.element[0].id;
                }
            }).on('apply.daterangepicker', function (ev, picker) {
                jQuery(this).data(
                    'original-value',
                    picker.startDate.format(format)
                )
                    .val(picker.startDate.format(format));
            }).on('cancel.daterangepicker', function (ev, picker) {
                jQuery(this).val(jQuery(this).data('original-value'));
            });
        });
    });
}
initDateRangePicker();

/*!
 * WHMCS Module Queue Javascript Functions
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2016
 * @license http://www.whmcs.com/license/ WHMCS Eula
 */
jQuery(document).ready(function() {
    var moduleQueueRetryAll = jQuery('button.retry-all');
    if (moduleQueueRetryAll.length) {
        var processed = false,
            queueTimeout = null,
            count = 0;

        jQuery('button.retry').click(function() {
            processed = false;
            var self = jQuery(this),
                entryId = jQuery(this).data('entry-id'),
                processingEntry = jQuery('div#processing-entry-' + entryId);

            self.attr('disabled', 'disabled').addClass('disabled').find('i').addClass('fa-spin').end();
            if (queueTimeout) {
                processingEntry.find('div.queued').hide().end()
                    .find('div.processing').show().end();
            } else {
                processingEntry.find('div.messages').children('div').hide().end()
                    .find('div.processing').show().end().end()
                    .hide().removeClass('hidden').slideDown('fast');
            }
            var connection = WHMCS.http.jqClient.post(
                window.location.pathname,
                {
                    token: csrfToken,
                    action: 'retry',
                    id: entryId
                },
                null,
                'json'
            );

            connection.done(function(data) {
                if (data.error) {
                    processingEntry.find('div.processing').hide().end()
                        .find('div.error').find('span').html(data.message).parent().show().end();
                    jQuery('#last-error-' + entryId).html(data.errorMessage);
                    jQuery('div#entry-' + entryId).find('small.last-attempt').find('span').html(data.lastAttempt);
                    self.removeAttr('disabled').removeClass('disabled').find('i').removeClass('fa-spin').end();
                    count++;
                }
                if (data.completed) {
                    jQuery('div#entry-' + entryId).find('div.action-buttons').find('button').removeClass('retry')
                        .attr('disabled', 'disabled').addClass('disabled')
                        .find('i.fa-spin').removeClass('fa-spin').end();
                    processingEntry.find('div.processing').slideUp('fast').end()
                        .find('div.success').slideDown('fast').end();
                }
            });

            connection.always(function() {
                processed = true;
            });
        });

        jQuery('button.resolve').click(function() {
            var self = jQuery(this),
                entryId = jQuery(this).data('entry-id'),
                processingEntry = jQuery('div#processing-entry-' + entryId);

            self.attr('disabled', 'disabled').addClass('disabled');

            processingEntry.find('div.messages').children('div').hide().end()
                .find('div.processing').show().end().end()
                .hide().removeClass('hidden').slideDown('fast');

            var connection = WHMCS.http.jqClient.post(
                window.location.pathname,
                {
                    token: csrfToken,
                    action: 'resolve',
                    id: entryId
                },
                null,
                'json'
            );

            connection.done(function(data) {
                if (data.completed) {
                    jQuery('div#entry-' + entryId).find('div.action-buttons').find('button').removeClass('retry')
                        .attr('disabled', 'disabled').addClass('disabled').end();
                    processingEntry.find('div.processing').slideUp('fast').end()
                        .find('div.success').find('span').html(data.message).parent().slideDown('fast').end();
                } else {
                    processingEntry.find('div.processing').slideUp('fast').end()
                        .find('div.error').find('span').html(data.message).parent().slideDown('fast').end();
                    self.removeAttr('disabled').removeClass('disabled');
                }

            });
        });

        moduleQueueRetryAll.click(function () {
            jQuery(this).attr('disabled', 'disabled').addClass('disabled')
                .find('i').addClass('fa-spin').end();
            var items = jQuery('button.retry');
            processed = true;
            count = 0;

            items.each(function(index) {
                var entryId = jQuery(this).data('entry-id');
                jQuery('div#processing-entry-' + entryId).find('div.messages').children('div').hide().end()
                    .find('div.queued').show().end().end()
                    .hide().removeClass('hidden').slideDown('fast');
            });

            queueTimeout = setTimeout(nextClick, 1000);
        });

        function nextClick()
        {
            if (processed) {
                var button = jQuery('button.retry:eq(' + count + ')');
                if (button.length) {
                    button.click();
                } else {
                    clearTimeout(queueTimeout);
                    queueTimeout = null;
                    moduleQueueRetryAll.removeAttr('disabled').removeClass('disabled')
                        .find('i').removeClass('fa-spin').end();
                    return;
                }
            }
            queueTimeout = setTimeout(nextClick, 1000);
        }
    }
});

/*!
 * WHMCS MarketConnect Admin JS Functions
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2022
 * @license https://www.whmcs.com/license/ WHMCS Eula
 */
jQuery(document).ready(function() {
    jQuery(document).on('click', '#btnMcServiceRefresh', function(e) {
        e.preventDefault();
        var btn = $(this);
        btn.find('i').addClass('fa-spin');
        WHMCS.http.jqClient.post({
            url: 'clientsservices.php',
            data: btn.attr('href') + '&token=' + csrfToken,
            success: function (data) {
                $('#mcServiceManagementWrapper').replaceWith(data.statusOutput);
                btn.find('i').removeClass('fa-spin');
            }
        });
    });
    jQuery(document).on('click', '#btnMcCancelOrder', function(e) {
        swal({
            title: 'Are you sure?',
            html: true,
            text: 'Cancelling this order will result in the service immediately ceasing to function.<br><br>You will automatically receive a credit if within the credit period. <a href="https://go.whmcs.com/1281/marketconnect-credit-terms" target="_blank">See credit period terms</a>',
            type: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, cancel it',
            cancelButtonText: 'No'
        },
        function(){
            runModuleCommand('terminate');
        });
    });
    jQuery(document).on('click', '#mcServiceManagementWrapper .btn:not(.open-modal,.btn-refresh,.btn-cancel)', function(e) {
        e.preventDefault();
        $('#growls').fadeOut('fast').remove();
        $('.successbox,.errorbox').slideUp('fast').remove();
        var button = $(this);
        var request = button.attr('href');
        var buttonIcon = button.find('i');
        var iconState = buttonIcon.attr('class');

        // If button is disabled, don't execute action
        if (button.attr('disabled') === 'disabled') {
            return;
        }

        buttonIcon.removeClass().addClass('fas fa-spin fa-spinner');

        WHMCS.http.jqClient.post('clientsservices.php', request + '&token=' + csrfToken, function (data) {
            if (data.redirectUrl) {
                window.open(data.redirectUrl);
            } else if (data.growl) {
                if (data.growl.type == 'error') {
                    $.growl.error({ title: '', message: data.growl.message });
                } else {
                    $.growl.notice({ title: '', message: data.growl.message });
                    $('#btnMcServiceRefresh').click();
                }
            } else {
                $.growl.error({ title: '', message: 'Unknown response' });
                console.error('[WHMCS] Unknown response: ' + JSON.stringify(data));
            }
        }, 'json').fail(function (xhr) {
            var response = (xhr.responseText != '' ? xhr.responseText : xhr.statusText);
            $.growl.error({ title: '', message: response })
        }).always(function (xhr) {
            buttonIcon.removeClass().addClass(iconState);
        });
    })
    .on('click', '.feature-menu-item', function(e) {
        e.preventDefault();
        var self = jQuery(this),
            name = self.data('name'),
            shownMenu = jQuery('.feature-menu-item.shown'),
            shownItem = jQuery('.feature-info-item.shown'),
            target = jQuery('.feature-info-item[data-name="' + name + '"]');

        shownMenu.removeClass('shown');
        self.addClass('shown');
        shownItem.slideUp('fast', function() {
            jQuery(this).removeClass('shown');
            target.hide().addClass('shown').slideDown('fast');
        })
    });
});

/**
 * WHMCS Telephone Country Code Dropdown
 *
 * Using https://github.com/jackocnr/intl-tel-input
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2019
 * @license https://www.whmcs.com/license/ WHMCS Eula
 */

jQuery(document).ready(function() {
    const telephoneSharedCountries = new Map([
        ['um', 'us'], // United States Outlying Islands shares dialing code with the US
        ['ic', 'es'], // Canary Islands shares dialing code with Spain
        ['gs', 'fk'], // South Georgia and Sandwich Islands shares dialing code with Falkland Islands
        ['aq', 'nf'], // Antarctica shares dialing code with Norfolk Island
        ['tf', 're'], // French Southern Territories shares dialing code with Réunion (La Réunion)
        ['hm', 'nf'], // Heard Island and Mcdonald Islands shares dialing code with Norfolk Island
        ['an', 'bq'], // Netherlands Antilles shares dialing code with Caribbean Netherlands
        ['pn', 'nz'], // Pitcairn shares dialing code with New Zealand
    ]);

    function assertTelephoneCountry(country) {
        country = country.toLowerCase();
        if (telephoneSharedCountries.has(country)) {
            return telephoneSharedCountries.get(country);
        }
        return country;
    }

    if (typeof customCountryData !== "undefined") {
        var teleCountryData = $.fn['intlTelInput'].getCountryData();
        for (var code in customCountryData) {
            if (customCountryData.hasOwnProperty(code)) {
                var countryDetails = customCountryData[code];
                codeLower = code.toLowerCase();
                if (countryDetails === false) {
                    for (var i = 0; i < teleCountryData.length; i++) {
                        if (codeLower === teleCountryData[i].iso2) {
                            teleCountryData.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    teleCountryData.push(
                        {
                            name: countryDetails.name,
                            iso2: codeLower,
                            dialCode: countryDetails.callingCode,
                            priority: 0,
                            areaCodes: null
                        }
                    );
                }
            }
        }
    }

    if (jQuery('body').data('phone-cc-input')) {
        var phoneInput = jQuery('input[name^="phone"], input[name$="phone"], input[name="domaincontactphonenumber"]').not('input[type="hidden"]');
        if (phoneInput.length) {
            var countryInput = jQuery('[name^="country"], [name$="country"]'),
                initialCountry = 'us';
            if (countryInput.length) {
                initialCountry = assertTelephoneCountry(countryInput.val());
            }

            phoneInput.each(function(){
                var thisInput = jQuery(this),
                    inputName = thisInput.attr('name');
                if (inputName === 'domaincontactphonenumber') {
                    initialCountry = jQuery('[name="domaincontactcountry"]').val().toLowerCase();
                }
                jQuery(this).before(
                    '<input id="populatedCountryCode' + inputName + '" type="hidden" name="country-calling-code-' + inputName + '" value="" />'
                );
                try {
                    thisInput.intlTelInput({
                        preferredCountries: [initialCountry, "us", "gb"].filter(function (value, index, self) {
                            return self.indexOf(value) === index;
                        }),
                        initialCountry: initialCountry,
                        autoPlaceholder: 'polite', //always show the helper placeholder
                        separateDialCode: true
                    });
                } catch (error) {
                    console.log(error.message);
                    return false;
                }

                thisInput.on('countrychange', function (e, countryData) {
                    jQuery('#populatedCountryCode' + inputName).val(countryData.dialCode);
                    if (jQuery(this).val() === '+' + countryData.dialCode) {
                        jQuery(this).val('');
                    }
                });
                thisInput.on('blur keydown', function (e) {
                    if (e.type === 'blur' || (e.type === 'keydown' && e.keyCode === 13)) {
                        var number = jQuery(this).intlTelInput("getNumber"),
                            countryData = jQuery(this).intlTelInput("getSelectedCountryData"),
                            countryPrefix = '+' + countryData.dialCode;

                        if (number.indexOf(countryPrefix) === 0 && (number.match(/\+/g) || []).length > 1) {
                            number = number.substr(countryPrefix.length);
                        }
                        jQuery(this).intlTelInput("setNumber", number);
                    }
                });
                jQuery('#populatedCountryCode' + inputName).val(thisInput.intlTelInput('getSelectedCountryData').dialCode);

                countryInput.on('change', function() {
                    if (thisInput.val() === '') {
                        var country = assertTelephoneCountry(jQuery(this).val());
                        try {
                            phoneInput.intlTelInput('setCountry', country);
                        } catch (error) {
                            console.log(error.message);
                            return false;
                        }
                    }
                });

                // this must be .attr (not .data) in order for it to be found by [data-initial-value] selector
                thisInput.attr('data-initial-value', $(thisInput).val());

                thisInput.parents('form').find('input[type=reset]').each(function() {
                    var resetButton = this;
                    var form = $(resetButton).parents('form');

                    if (!$(resetButton).data('phone-handler')) {
                        $(resetButton).data('phone-handler', true);

                        $(resetButton).click(function(e) {
                            e.stopPropagation();

                            $(form).trigger('reset');

                            $(form).find('input[data-initial-value]').each(function() {
                                var inputToReset = this;

                                $(inputToReset).val(
                                    $(inputToReset).attr('data-initial-value')
                                );
                            });

                            return false;
                        });
                    }
                });
            });

            /**
             * In places where a form icon is present, hide it.
             * Where the input has a class of field, remove that and add form-control in place.
             */
            phoneInput.parents('div.form-group').find('.field-icon').hide().end();
            phoneInput.removeClass('field').addClass('form-control');
        }

        var registrarPhoneInput = jQuery('input[name$="][Phone Number]"], input[name$="][Phone]"]').not('input[type="hidden"]');
        if (registrarPhoneInput.length) {
            jQuery.each(registrarPhoneInput, function(index, input) {
                var thisInput = jQuery(this),
                    inputName = thisInput.attr('name');
                inputName = inputName.replace('contactdetails[', '').replace('][Phone Number]', '').replace('][Phone]', '');

                var countryInput = jQuery('[name$="' + inputName + '][Country]"]'),
                    initialCountry = assertTelephoneCountry(countryInput.val());

                thisInput.before('<input id="populated' + inputName + 'CountryCode" class="' + inputName + 'customwhois" type="hidden" name="contactdetails[' + inputName + '][Phone Country Code]" value="" />');
                thisInput.intlTelInput({
                    preferredCountries: [initialCountry, "us", "gb"].filter(function(value, index, self) {
                        return self.indexOf(value) === index;
                    }),
                    initialCountry: initialCountry,
                    autoPlaceholder: 'polite', //always show the helper placeholder
                    separateDialCode: true
                });

                thisInput.on('countrychange', function (e, countryData) {
                    jQuery('#populated' + inputName + 'CountryCode').val(countryData.dialCode);
                    if (jQuery(this).val() === '+' + countryData.dialCode) {
                        jQuery(this).val('');
                    }
                });
                thisInput.on('blur keydown', function (e) {
                    if (e.type === 'blur' || (e.type === 'keydown' && e.keyCode === 13)) {
                        var number = jQuery(this).intlTelInput("getNumber"),
                            countryData = jQuery(this).intlTelInput("getSelectedCountryData"),
                            countryPrefix = '+' + countryData.dialCode;

                        if (number.indexOf(countryPrefix) === 0 && (number.match(/\+/g) || []).length > 1) {
                            number = number.substr(countryPrefix.length);
                        }
                        jQuery(this).intlTelInput("setNumber", number);
                    }
                });
                jQuery('#populated' + inputName + 'CountryCode').val(thisInput.intlTelInput('getSelectedCountryData').dialCode);

                countryInput.on('blur', function() {
                    if (thisInput.val() === '') {
                        var country = assertTelephoneCountry(jQuery(this).val());
                        thisInput.intlTelInput('setCountry', country);
                    }
                });

            });
        }
    }
});
