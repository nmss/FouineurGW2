/* global $ */

var selectors = {
    filterButton: '#filter-button',
    reload: '#reload',
    searchFilter: '#search-filter'
};

var elements = {
    accounts: {}
};

function get_guids() {
    if (!location.hash) {
        return JSON.parse(localStorage.getItem("guids") || "[]");
    }
    var guids = location.hash.slice(1).split(",");
    localStorage.setItem("guids", JSON.stringify(guids));
    try {
        history.replaceState(undefined, document.title, location.pathname);
    } catch (e) {
        location.href = location.pathname;
    }
    return guids;
}
var guids;

$(window).on("hashchange", function() {
    guids = get_guids();
});

var Cache = {
    saveDelay: 1000,
    timeoutId: undefined,
    set: function(key, value) {
        if (this.ttl !== Infinity) {
            value.timestamp = Date.now();
        }
        this.cache[key] = value;
        this.save();
    },
    isStale: function(key) {
        if (this.cache[key] === undefined || this.ttl === Infinity) {
            return true;
        }
        if (this.cache[key].timestamp + this.ttl >= Date.now()) {
            return false;
        }
        delete this.cache[key];
        this.save();
        return true;
    },
    save: function() {
        if (this.timeoutId) {
            this.timeoutId = clearTimeout(this.timeoutId);
        }
        this.timeoutId = setTimeout(this._save.bind(this), this.saveDelay);
    },
    _save: function() {
        this.timeoutId = undefined;
        localStorage.setItem(this.key, JSON.stringify(this.cache));
    },
    init: function(options) {
        this.key = options.key;
        this.ttl = options.ttl || Infinity;
        this.cache = JSON.parse(localStorage.getItem(this.key) || '{}');
        return this;
    },
    constructor: Cache
};
var items = Object.create(Cache).init({ key: 'itemCache' });
var skins = Object.create(Cache).init({ key: 'skinCache' });
var unknownItems = Object.create(Cache).init({ key: 'unknownItemCache', ttl: 24 * 60 * 60 * 1000 });
var guilds = Object.create(Cache).init({ key: 'guildCache', ttl: 24 * 60 * 60 * 1000 });
var icons = {
    Female: "https://cdn3.iconfinder.com/data/icons/fatcow/16/female.png",
    Male: "https://cdn3.iconfinder.com/data/icons/fatcow/16x16_0560/male.png",
    Asura: "https://wiki.guildwars2.com/images/1/1f/Asura_tango_icon_20px.png",
    Charr: "https://wiki.guildwars2.com/images/f/fa/Charr_tango_icon_20px.png",
    Human: "https://wiki.guildwars2.com/images/e/e1/Human_tango_icon_20px.png",
    Norn: "https://wiki.guildwars2.com/images/3/3d/Norn_tango_icon_20px.png",
    Sylvari: "https://wiki.guildwars2.com/images/2/29/Sylvari_tango_icon_20px.png",
    Elementalist: "https://wiki.guildwars2.com/images/a/aa/Elementalist_tango_icon_20px.png",
    Engineer: "https://wiki.guildwars2.com/images/2/27/Engineer_tango_icon_20px.png",
    Guardian: "https://wiki.guildwars2.com/images/8/8c/Guardian_tango_icon_20px.png",
    Mesmer: "https://wiki.guildwars2.com/images/6/60/Mesmer_tango_icon_20px.png",
    Necromancer: "https://wiki.guildwars2.com/images/4/43/Necromancer_tango_icon_20px.png",
    Ranger: "https://wiki.guildwars2.com/images/4/43/Ranger_tango_icon_20px.png",
    Revenant: "https://wiki.guildwars2.com/images/b/b5/Revenant_tango_icon_20px.png",
    Thief: "https://wiki.guildwars2.com/images/7/7a/Thief_tango_icon_20px.png",
    Warrior: "https://wiki.guildwars2.com/images/4/43/Warrior_tango_icon_20px.png",
    Armorsmith: "http://wiki.guildwars2.com/images/3/32/Armorsmith_tango_icon_20px.png",
    Artificer: "http://wiki.guildwars2.com/images/b/b7/Artificer_tango_icon_20px.png",
    Chef: "http://wiki.guildwars2.com/images/8/8f/Chef_tango_icon_20px.png",
    Huntsman: "http://wiki.guildwars2.com/images/f/f3/Huntsman_tango_icon_20px.png",
    Jeweler: "http://wiki.guildwars2.com/images/f/f2/Jeweler_tango_icon_20px.png",
    Leatherworker: "http://wiki.guildwars2.com/images/e/e5/Leatherworker_tango_icon_20px.png",
    Tailor: "http://wiki.guildwars2.com/images/4/4d/Tailor_tango_icon_20px.png",
    Weaponsmith: "http://wiki.guildwars2.com/images/4/46/Weaponsmith_tango_icon_20px.png",
    //Unknown: "https://wiki.guildwars2.com/images/8/86/Any_tango_icon_20px.png",
    undefined: "https://wiki.guildwars2.com/images/8/86/Any_tango_icon_20px.png"
};
var ENDPOINT = "https://api.guildwars2.com/v2/";
var UNKNOWN_ITEM = {
    icon: "http://wiki.guildwars2.com/images/1/1d/Deleted_Item.png",
    name: "Objet non identifié",
    rarity: "Unknown",
    level: "0",
    type: "Unknown"
};

function get_url(path, key) {
    var url = ENDPOINT + path;
    if (key) {
        url = url + "?access_token=" + key;
    }
    return url;
}

function create_empty(bdata, target) {
    var ic = $("<div/>").addClass("item").addClass("r_Empty");
    ic.attr({
        type: "Empty",
        level: "0"
    }).data("name", "empty slot");
    target.append(ic);
}

function create_bag_item(bdata, target) {
    var ic = $("<div/>").addClass("item").addClass("r_" + bdata.item.rarity);
    ic.attr({
        type: bdata.item.type,
        level: bdata.item.level
    }).append($("<img/>").attr({
        src: bdata.skin ? bdata.sk.icon : bdata.item.icon,
        title: bdata.skin ? bdata.sk.name : bdata.item.name
    })).data("name", bdata.skin ? bdata.sk.name.toLowerCase() : bdata.item.name.toLowerCase());
    if (bdata.count > 1) {
        ic.append($("<div/>").text(bdata.count).addClass("count"));
    }
    else if (bdata.count < 1) {
        ic.addClass("r_Empty");
    }
    target.append(ic);
}

function update_bag(bag, target) {
    for (var bdata of bag) {
        if (bdata) {
            bdata.item = items.cache[bdata.id];
            bdata.sk = skins.cache[bdata.skin];
            if (!bdata.item) {
                bdata.item = $.extend(true, {}, UNKNOWN_ITEM);
                bdata.item.name = bdata.item.name + " [" + bdata.id + "]";
            }
            create_bag_item(bdata, target);
        }
        else {
            create_empty(null, target);
        }
    };
}

function loadItems(ids) {
    if (!ids.length) {
        return;
    }
    var url = get_url("items") + "?ids=" + ids.join(',');
    return $.getJSON(url, function(data) {
        $.each(data, function(i, itemdata) {
            items.set(itemdata.id, itemdata);
        });
    }).fail(function(jqXHR) {
        if (jqXHR.status === 404) {
            ids.forEach(function(id) {
                unknownItems.set(id, {});
            });
        }
    });
}

function loadSkins(ids) {
    if (!ids.length) {
        return;
    }
    var url = get_url("skins") + "?ids=" + ids.join(',');
    return $.getJSON(url, function(data) {
        $.each(data, function(i, skindata) {
            skins.set(skindata.id, skindata);
        });
    }).fail(function(jqXHR) {
        if (jqXHR.status === 404) {
            ids.forEach(function(id) {
                unknownItems.set(id, {});
            });
        }
    });
}

function get_bag(bag, target) {
    var itemids = [];
    var skinids = [];
    var items_in_bag = false;
    for (var bagitem of bag) {
        if (bagitem) {
            items_in_bag = true;
            if (!items.cache[bagitem.id] && unknownItems.isStale(bagitem.id)) {
                itemids.push(bagitem.id);
            }
            if (bagitem.skin && !skins.cache[bagitem.skin] && unknownItems.isStale(bagitem.skin)) {
                skinids.push(bagitem.skin);
            }
        }
    };
    Promise.resolve()
        .then(loadSkins.bind(this, skinids))
        .then(loadItems.bind(this, itemids))
        .catch(function(err) {
            console.error("Erreur : ", err);
        })
        .then(update_bag.bind(this, bag, target));
}

function get_mats_data(key, account) {
    var curl = get_url("account/materials", key);
    $.getJSON(curl, function(matsdata) {
        var chardiv = $("<div/>").addClass("mats");
        chardiv.append($("<span/>").addClass("title").text("Matériaux"));
        var itemsdiv = $("<div/>").addClass("matstabs");
        chardiv.append(itemsdiv);
        while (matsdata.length) {
            get_bag(matsdata.splice(0, 150), itemsdiv);
        }
        elements.accounts[account].append(chardiv);
    });
}

function get_bank_data(key, account) {
    var curl = get_url("account/bank", key);
    $.getJSON(curl, function(bankdata) {
        var chardiv = $("<div/>").addClass("bank");
        chardiv.append($("<span/>").addClass("title").text("Banque"));
        var itemsdiv = $("<div/>").addClass("banktabs");
        chardiv.append(itemsdiv);
        while (bankdata.length) {
            get_bag(bankdata.splice(0, 150), itemsdiv);
        }
        elements.accounts[account].append(chardiv);
    });
}

function get_char_data(character, key, account) {
    var curl = get_url("characters/" + character, key);
    var chardiv = $("<div/>").addClass("character");
    elements.accounts[account].find(".characters").append(chardiv);
    $.getJSON(curl, function(cdata) {
        var adde = (cdata.gender == "Male") ? "" : "e";
        var discis = "";
        $.each(cdata.crafting, function(i, disci) {
            if (disci) {
                discis += "<br><img src=\"" + icons[disci.discipline] + "\" class=\"icon " + disci.discipline + "\" alt=\"" + disci.discipline + "\" title=\"" + disci.discipline + "\">" + disci.rating;
            }
        });
        chardiv.append($("<span/>").addClass("title").text(character), "<br>", $("<div/>").addClass("spec").append($("<img/>").attr({ src: icons[cdata.gender], class: "icon " + cdata.gender, alt: cdata.gender, title: cdata.gender }), $("<img/>").attr({ src: icons[cdata.race], class: "icon " + cdata.race, alt: cdata.race, title: cdata.race }), $("<img/>").attr({ src: icons[cdata.profession], class: "icon " + cdata.profession, alt: cdata.profession, title: cdata.profession }), cdata.level + "<br>Né" + adde + " le " + formatDate(cdata.created) + "<br>" + cdata.deaths + " décès" + discis)).attr({ race: cdata.race, prof: cdata.profession, gender: cdata.gender, level: cdata.level });
        var itemsdiv = $("<div/>").addClass("stuff");
        chardiv.append(itemsdiv);
        get_bag(cdata.equipment, itemsdiv);
        $.each(cdata.bags, function(i, bag) {
            if (!bag) { return; }
            var itemsdiv = $("<div/>").addClass("bag");
            chardiv.append(itemsdiv);
            get_bag(bag.inventory, itemsdiv);
        });
        var guildId = cdata.guild;
        if (guildId) {
            function insertGuildIntoPage(guildData) {
                chardiv.append($("<img/>").addClass("charbg").attr("src", "http://guilds.gw2w2w.com/" + guildId + ".svg"));
                var putag = chardiv.children("span.title");
                putag.append(" [" + guildData.tag + "]");
            }
            if (guilds.isStale(guildId)) {
                var gurl = "https://api.guildwars2.com/v1/guild_details?guild_id=" + guildId;
                $.getJSON(gurl, function(gdata) {
                    guilds.set(guildId, gdata);
                    insertGuildIntoPage(gdata);
                });
            } else {
                insertGuildIntoPage(guilds.cache[guildId]);
            }
        }
    });
}


function formatDate(t) {
    return new Date(t).toLocaleDateString();
}

function get_content(key, account) {
    var url = get_url("characters", key);
    $.getJSON(url, function(data) {
        var charsdiv = $("<div/>").addClass("characters");
        elements.accounts[account].append(charsdiv);
        $.each(data, function(i, charname) {
            get_char_data(charname, key, account);
        });
        get_bank_data(key, account);
        get_mats_data(key, account);
    });
}

function buildnum() {
    var urlbuild = "https://api.guildwars2.com/v2/build";
    $.getJSON(urlbuild, function(data) {
        $("#build").html(data.id);
    });
}

function charfilter() {
    var levcmin = ($("#levcmin").val() == "") ? 1 : parseInt($("#levcmin").val());
    var levcmax = ($("#levcmax").val() == "") ? 80 : parseInt($("#levcmax").val());
    var tohide = [];
    $("input:checkbox:not(:checked,.rarity,.checkAll)").each(function() {
        tohide.push($(this).closest("label").attr("class").replace('background-icon', '').trim());
    });
    $(".character").each(function(index, character) {
        var $character = $(character);
        var charlev = parseInt($character.attr("level"));
        var charattr = $character.listAttributes();
        var hasForbiddenAttr = charattr.some(function(x) {
            return tohide.indexOf($character.attr(x)) !== -1;
        }.bind(this));
        if (levcmin > charlev || charlev > levcmax || hasForbiddenAttr) {
            $(this).hide();
        } else {
            $(this).show();
        }
    });
}

function filterEmptySlotIfNeeded(targetElement) {
    if ($(targetElement).closest("label").hasClass('Empty')) {
        return;
    }
    var $elem = $('#items .type .Empty input');
    var checkboxesFilter = $('#items .filter-item label:not(.Empty) input:checkbox');
    var numberChecked = checkboxesFilter.filter(':checked').length;
    var totalNumber = checkboxesFilter.length;
    $elem.prop("checked", numberChecked === totalNumber);
}

function itemfilter() {
    filterEmptySlotIfNeeded(this);
    var levimin = ($("#levimin").val() == "") ? 0 : parseInt($("#levimin").val());
    var levimax = ($("#levimax").val() == "") ? 80 : parseInt($("#levimax").val());
    var filtervalue = $(selectors.searchFilter).val().toLowerCase();
    var toshow = [];
    $("#items .filter-item :checked").each(function() {
        toshow.push($(this).closest("label").attr("class"));
    });
    $(".item").each(function(index, item) {
        var $item = $(item);
        var name = $item.data("name");
        var rari = $item.attr("class").split(" ")[1].slice(2);
        var type = $item.attr("type");
        var itemlev = parseInt($item.attr("level"));
        if (name.indexOf(filtervalue) > -1 && toshow.indexOf(rari) > -1 && toshow.indexOf(type) > -1 && levimin <= itemlev && itemlev <= levimax) {
            $item.show();
        } else {
            $item.hide();
        }
    });
}

function reload() {
    buildnum();
    $("#content").empty();
    $(selectors.searchFilter).val("");
    $(".levfilter").val("");
    $("input:checkbox").prop("checked", true);
    elements.accounts = {};
    $.each(guids, function(j, key) {
        var url = get_url("account", key);
        $.getJSON(url, function(data) {
            var account = data.name.replace(".", "   ·   ");
            var $account = elements.accounts[account] = $("<div/>").addClass("account");
            $("#content").append($account);
            $account.append($("<h2/>").text(account).attr("title", "Créé le " + formatDate(data.created)));
            var wurl = get_url("worlds/" + data.world, key);
            $.getJSON(wurl, function(wdata) {
                $account.append($("<h6/>").text(wdata.name));
            });
            get_content(key, account);
        });
    });
    document.querySelector(selectors.searchFilter).focus();
}

function initEvents() {
    $(selectors.searchFilter).keyup(itemfilter);
    $("#items input").change(itemfilter);
    $(".gender,.race,.prof").change(charfilter);
    $("#items .levfilter").keyup(itemfilter);
    $("#chars .levfilter").keyup(charfilter);
    $(".checkAll").change(function() {
        var $element = $(this);
        var $group = $element.closest('.filter-group');
        var checked = $element.prop("checked");
        $group.find('input:checkbox').prop('checked', checked);
        if ($group.closest('#items').length) {
            itemfilter();
        } else {
            charfilter();
        }
    });

    $('ul.tabs li').click(function() {
        var tab_id = $(this).attr('toshow');

        $('ul.tabs li').removeClass('current');
        $('.tab-content').removeClass('current');

        $(this).addClass('current');
        $("#" + tab_id).addClass('current');
    });

    $(selectors.filterButton).click(function() {
        $("#filterdiv").toggle();
    });

    $(selectors.reload).click(reload);
}

$(window).load(function() {
    buildnum();
    $('#filterdiv input:checkbox').click();
    guids = get_guids();
    initEvents();
});