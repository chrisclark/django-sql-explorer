import {getCsrfToken} from "./csrf";
import { marked } from "marked";
import DOMPurify from "dompurify";

const spinner = "<div class=\"spinner-border text-primary\" role=\"status\"><span class=\"visually-hidden\">Loading...</span></div>";

function getCheckedAssistantValue() {
    const checkedRadio = document.querySelector('input[name="assistant-option"]:checked');
    if (checkedRadio) {
        return checkedRadio.id;
    }
    return null;
}

export function setUpAssistant() {

    document.getElementById('ask_assistant_btn').addEventListener('click', function() {
        const data = {
            include_current_query: document.getElementById("include_query").checked,
            include_relevant_tables: document.getElementById("include_relevant_tables").checked,
            include_results_sample: document.getElementById("include_results_sample").checked,
            sql: window.editor.state.doc.toString(),
            connection: document.getElementById("id_connection").value,
            assistant_request: document.getElementById("id_assistant_input").value
        };

        document.getElementById("response_block").style.display = "block";
        document.getElementById("assistant_response").innerHTML = spinner;

        fetch('/assistant/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
            throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const output = DOMPurify.sanitize(marked.parse(data.message));
            document.getElementById("response_block").style.display = "block";
            document.getElementById("assistant_response").innerHTML = output;
            setUpCopyButtons();
        })
            .catch(error => {
            console.error('Error:', error);
        });
    });
}

function setUpCopyButtons(){
    document.querySelectorAll('#assistant_response pre').forEach(pre => {

        const btn = document.createElement('i');
        btn.classList.add('copy-btn');
        btn.classList.add('bi-copy');

        pre.appendChild(btn);

        btn.addEventListener('click', function() {
            const code = this.parentNode.firstElementChild.innerText;
            navigator.clipboard.writeText(code).then(() => {
                alert('Code copied to clipboard!');
            }).catch(err => {
                console.error('Error in copying text: ', err);
            });
        });
    });
}
