var csrf_token = $.cookie('csrftoken');
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        xhr.setRequestHeader("X-CSRFToken", csrf_token);
    }
});

function ExplorerEditor(queryId, dataUrl) {
    this.queryId = queryId;
    this.dataUrl = dataUrl;
    this.$table = $('#preview');
    this.$rows = $('#rows');
    this.editor = CodeMirror.fromTextArea(document.getElementById('id_sql'), {
        mode: "text/x-sql",
        lineNumbers: 't',
        autofocus: true,
        extraKeys: {
            "Ctrl-Enter": this.doCodeMirrorSubmit,
            "Cmd-Enter": this.doCodeMirrorSubmit
        }
    });
    this.bind();
}

ExplorerEditor.prototype.getParams = function(el) {
    var params$ = $(el).closest("form").find(".param"),
        o = false;
    if(params$.length) {
        o = new Object;
        params$.each(function() {
            o[this.id.replace("_param", "")] = $(this).val();
        });
    }
    return o;
};

ExplorerEditor.prototype.doCodeMirrorSubmit = function() {
    // Captures the cmd+enter keystroke and figures out which button to trigger.
    var $btn = $("#save_button");
    if ($btn.length) {
        $btn.click();
    } else {
        $("#refresh_button").click();
    }
};

ExplorerEditor.prototype.updateQueryString = function(key, value, url) {
    // http://stackoverflow.com/a/11654596/221390
    if (!url) url = window.location.href;
    var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi");

    if (re.test(url)) {
        if (typeof value !== 'undefined' && value !== null)
            return url.replace(re, '$1' + key + "=" + value + '$2$3');
        else {
            var hash = url.split('#');
            url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
            if (typeof hash[1] !== 'undefined' && hash[1] !== null)
                url += '#' + hash[1];
            return url;
        }
    }
    else {
        if (typeof value !== 'undefined' && value !== null) {
            var separator = url.indexOf('?') !== -1 ? '&' : '?',
                hash = url.split('#');
            url = hash[0] + separator + key + '=' + value;
            if (typeof hash[1] !== 'undefined' && hash[1] !== null)
                url += '#' + hash[1];
            return url;
        }
        else
            return url;
    }
};

ExplorerEditor.prototype.formatSql = function() {
    var jqxhr = $.post('../format/', {sql: this.editor.getValue() }, function(data) {
      this.editor.setValue(data.formatted);
    }.bind(this));
};

ExplorerEditor.prototype.showRows = function() {
    rows = this.$rows.val();
    var $form = $("#editor")
    $form.attr('action', this.updateQueryString("rows", rows, window.location.href));
    $form.submit()
};

ExplorerEditor.prototype.bind = function() {
    $("#show_schema_button").click(function() {
        $("#schema_frame").attr('src', '../schema/');
        $("#query_area").addClass("col-md-9");
        var schema$ = $("#schema");
        schema$.addClass("col-md-3");
        schema$.show();
        $(this).hide()
        $("#hide_schema_button").show()
        return false;
    });

    $("#hide_schema_button").click(function() {
        $("#query_area").removeClass("col-md-9");
        var schema$ = $("#schema");
        schema$.removeClass("col-md-3");
        schema$.hide();
        $(this).hide()
        $("#show_schema_button").show()
        return false;
    });

    $("#format_button").click(function(e) {
        e.preventDefault();
        this.formatSql();
    }.bind(this));

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        if(e.target.hash == "#chart") {
            var pageController = new PageController();
            pageController.setupPage({dataUrl: this.dataUrl})
        }
    }.bind(this));

    $("#save_button").click(function() {
        var params = this.getParams(this);
        if(params) {
            $(this).closest("form").attr('action', '../' + this.queryId + '/?params=' + JSON.stringify(params));
        }
    }.bind(this));

    $("#refresh_button").click(function(e) {
        e.preventDefault();
        var params = this.getParams(this);
        if(params) {
            window.location.href = '../' + this.queryId + '/?params=' + JSON.stringify(params);
        } else {
            window.location.href = '../' + this.queryId + '/';
        }
    }.bind(this));

    $("#playground_button").click(function() {
        $(this).closest("form").attr('action', '../play/');
    });

    $("#refresh_play_button").click(function() {
        $(this).closest("form").attr('action', '../play/');
    });

    $("#download_play_button").click(function() {
        $(this).closest("form").attr('action', '../csv');
    });

    $(".download_button").click(function(e) {
        e.preventDefault();
        var dl_link = 'download';
        var params = this.getParams(this);
        if(params) { dl_link = dl_link + '?params=' + JSON.stringify(params); }
        window.open(dl_link, '_blank');
    }.bind(this));

    $("#create_button").click(function() {
        $(this).closest("form").attr('action', '../new/');
    });

    this.$table.floatThead({
        scrollContainer: function($table){
            return $table.closest('#overflow_wrapper');
        }
    });

    this.$rows.change(function() { this.showRows(); }.bind(this));
    this.$rows.keyup(function(event){
        if(event.keyCode == 13){ this.showRows(); }
    }.bind(this));
};