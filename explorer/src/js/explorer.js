import $ from 'jquery';
import { EditorView } from "codemirror";
import { explorerSetup } from "./codemirror-config";
import { setUpAssistant } from "./assistant";

import cookie from 'cookiejs';
import List from 'list.js'

import { getCsrfToken } from "./csrf";
import { toggleFavorite } from "./favorites";

import {schemaCompletionSource, StandardSQL} from "@codemirror/lang-sql";
import {StateEffect} from "@codemirror/state";


function editorFromTextArea(textarea) {
    let view = new EditorView({
        doc: textarea.value,
        extensions: [
            explorerSetup,
        ]})
    textarea.parentNode.insertBefore(view.dom, textarea)
    textarea.style.display = "none"
    if (textarea.form) textarea.form.addEventListener("submit", () => {
        textarea.value = view.state.doc.toString()
    })
    return view
}

export class ExplorerEditor {
    constructor(queryId) {

        setUpAssistant();

        this.queryId = queryId;
        this.$table = $("#preview");
        this.$rows = $("#rows");
        this.$form = $("form");
        this.$snapshotField = $("#id_snapshot");
        this.docChanged = false;

        this.$submit = $("#refresh_play_button, #save_button");
        if (!this.$submit.length) {
            this.$submit = $("#refresh_button");
        }

        this.editor = editorFromTextArea(document.getElementById("id_sql"));

        window.editor = this.editor;

        document.addEventListener('submitEventFromCM', (e) => {
            this.$submit.click();
        });

        document.addEventListener('docChanged', (e) => {
            this.docChanged = true;
        });

        this.bind();

        if (cookie.get("schema_sidebar_open") === 'true') {
            this.showSchema(true);
        }
    }

    getParams() {
        let o = false;
        const params = document.querySelectorAll("form .param");
        if (params.length) {
            o = {};
            params.forEach((param) => {
                o[param.dataset.param] = param.value;
            });
        }
        return o;
    }

    serializeParams(params) {
        var args = [];
        for(var key in params) {
            args.push(key + ":" + params[key]);
        }
        return encodeURIComponent(args.join("|"));
    }

    updateQueryString(key, value, url) {
        // http://stackoverflow.com/a/11654596/221390
        if (!url) url = window.location.href;
        var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"),
            hash = url.split("#");

        if (re.test(url)) {
            if (typeof value !== "undefined" && value !== null)
                return url.replace(re, "$1" + key + "=" + value + "$2$3");
            else {
                url = hash[0].replace(re, "$1$3").replace(/(&|\?)$/, "");
                if (typeof hash[1] !== "undefined" && hash[1] !== null)
                    url += "#" + hash[1];
                return url;
            }
        }
        else {
            if (typeof value !== "undefined" && value !== null) {
                var separator = url.indexOf("?") !== -1 ? "&" : "?";
                url = hash[0] + separator + key + "=" + value;
                if (typeof hash[1] !== "undefined" && hash[1] !== null)
                    url += "#" + hash[1];
                return url;
            }
            else
                return url;
        }
    }

    formatSql() {
        let sqlText = this.editor.state.doc.toString();
        let editor = this.editor;

        var formData = new FormData();
        formData.append('sql', sqlText); // Append the SQL text to the form data

        // Make the fetch call
        fetch("../format/", {
            method: "POST",
            headers: {
                // 'Content-Type': 'application/x-www-form-urlencoded', // Not needed when using FormData, as the browser sets it along with the boundary
                'X-CSRFToken': getCsrfToken()
            },
            body: formData // Use the FormData object as the body
        })
        .then(response => response.json()) // Parse the JSON response
        .then(data => {
            editor.dispatch({
                changes: {
                    from: 0,
                    to: editor.state.doc.length,
                    insert: data.formatted
                }
            });
        })
        .catch(error => console.error('Error:', error));
    }

    showRows() {
        let rows = document.getElementById("rows").value;
        let form = document.getElementById("editor");
        form.setAttribute("action", this.updateQueryString("rows", rows, window.location.href));
        form.submit();
    }

    showSchema(noAutofocus) {
        $("#schema_frame").attr("src", "../schema/" + $("#id_connection").val());
        if (noAutofocus === true) {
            $("#schema_frame").addClass("no-autofocus");
        }
        $("#query_area").removeClass("col").addClass("col-9");
        var schema$ = $("#schema");
        schema$.addClass("col-md-3");
        schema$.show();
        $("#show_schema_button").hide();
        $("#hide_schema_button").show();
        cookie.set("schema_sidebar_open", 'true');
        return false;
    }

    hideSchema() {
        $("#query_area").removeClass("col-9").addClass("col");
        var schema$ = $("#schema");
        schema$.removeClass("col-3");
        schema$.hide();
        $("#hide_schema_button").hide();
        $("#show_schema_button").show();
        cookie.set("schema_sidebar_open", 'false');
        return false;
    }

    handleBeforeUnload = (event) => {
        if (clientRoute === 'query_detail' && this.docChanged) {
            const confirmationMessage = "You have unsaved changes to your query.";
            event.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    };

    bind() {

        window.addEventListener("beforeunload", this.handleBeforeUnload)

        document.addEventListener("submit", (event) => {
            // Disable unsaved changes warning when submitting the editor form
            if (event.target.id === "editor") {
                window.removeEventListener("beforeunload", this.handleBeforeUnload);
            }
        })

        document.querySelectorAll('.query_favorite_toggle').forEach(function(element) {
            element.addEventListener('click', toggleFavorite);
        });

        document.getElementById('show_schema_button').addEventListener('click', this.showSchema.bind(this));
        document.getElementById('hide_schema_button').addEventListener('click', this.hideSchema.bind(this));


        $("#format_button").click(function(e) {
            e.preventDefault();
            this.formatSql();
        }.bind(this));

        $("#rows").keyup(function() {
            var curUrl = $("#fullscreen").attr("href");
            var newUrl = curUrl.replace(/rows=\d+/, "rows=" + $("#rows").val());
            $("#fullscreen").attr("href", newUrl);
        }.bind(this));

        $("#save_button").click(function() {
            var params = this.getParams(this);
            if(params) {
                this.$form.attr("action", "../" + this.queryId + "/?params=" + this.serializeParams(params));
            }
            this.$snapshotField.hide();
            this.$form.append(this.$snapshotField);
        }.bind(this));

        $("#save_only_button").click(function() {
            var params = this.getParams(this);
            if(params) {
                this.$form.attr('action', '../' + this.queryId + '/?show=0&params=' + this.serializeParams(params));
            } else {
                this.$form.attr('action', '../' + this.queryId + '/?show=0');
            }
            this.$snapshotField.hide();
            this.$form.append(this.$snapshotField);
        }.bind(this));

        $("#refresh_button").click(function(e) {
            e.preventDefault();
            var params = this.getParams();
            if(params) {
                window.location.href = "../" + this.queryId + "/?params=" + this.serializeParams(params);
            } else {
                window.location.href = "../" + this.queryId + "/";
            }
        }.bind(this));

        $("#refresh_play_button").click(function() {
            this.$form.attr("action", "../play/");
        }.bind(this));

        $("#playground_button").click(function(e) {
            e.preventDefault();
            this.$form.attr("action", "../play/?show=0");
            this.$form.submit();
        }.bind(this));

        $("#create_button").click(function() {
            this.$form.attr("action", "../new/");
        }.bind(this));

        $(".download-button").click(function(e) {
            var url = "../download?format=" + $(e.target).data("format");
            var params = this.getParams();
            if(params) {
                url = url + "&params=" + params;
            }
            this.$form.attr("action", url);
        }.bind(this));

        $(".download-query-button").click(function(e) {
            var url = "../download?format=" + $(e.target).data("format");
            var params = this.getParams();
            if(params) {
                url = url + "&params=" + params;
            }
            this.$form.attr("action", url);
        }.bind(this));

        document.querySelectorAll('.stats-expand').forEach(element => {
            element.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.stats-expand').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.stats-wrapper').forEach(el => el.style.display = '');
            });
        });

        let counterToggle = document.getElementById('counter-toggle');
        if (counterToggle) {
            counterToggle.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.counter').forEach(el => {
                    el.style.display = el.style.display === 'none' ? '' : 'none';
                });
            });
        }

        // List.js setup for the preview pane to support sorting
        let previewPane = document.querySelector('#preview');
        if (previewPane) {
            let thElements = previewPane.querySelectorAll('th');
            new List('preview', {
                valueNames: Array.from(thElements, (_, index) => index)
            });
        }

        document.querySelectorAll('.sort').forEach(sortButton => {
            sortButton.addEventListener('click', function(e) {
                const target = e.target;

                // Reset icons on all sort buttons
                document.querySelectorAll('.sort').forEach(btn => {
                    btn.classList.add('bi-chevron-expand');
                    btn.classList.remove('bi-chevron-down', 'bi-chevron-up');
                });

                if ( target.classList.contains('asc') ) {
                    target.classList.replace('bi-chevron-expand', 'bi-chevron-up');
                    target.classList.remove('bi-chevron-down');
                } else {
                    target.classList.replace('bi-chevron-expand', 'bi-chevron-down');
                    target.classList.remove('bi-chevron-up');
                }

            }.bind(this));
        });

        const tabEl = document.querySelector('button[data-bs-target="#nav-pivot"]')
        if (tabEl) {
            tabEl.addEventListener('shown.bs.tab', event => {
                import('./pivot-setup').then(({pivotSetup}) => pivotSetup($));
            });
        }

        // Pretty hacky, but at the moment URL hashes are only used for storing pivot state, so this is a safe
        // way of checking if we are following a link to a pivot table.
        if (window.location.hash) {
            document.querySelector('#nav-pivot-tab').click();
        }

        this.$rows.change(function() { this.showRows(); }.bind(this));
        this.$rows.keyup(function(event) {
            if(event.keyCode === 13){ this.showRows(); }
        }.bind(this));

        fetch('../schema.json/' + $("#id_connection").val())
            .then(response => {
                return response.json();
            })
            .then(data => {
                this.editor.dispatch({
                    effects: StateEffect.appendConfig.of(
                        StandardSQL.language.data.of({
                          autocomplete: schemaCompletionSource({schema: data})
                        })
                    )
                })
                return data;
            })
            .catch(error => {
                console.error('Error retrieving JSON schema:', error);
            });
    }
}
