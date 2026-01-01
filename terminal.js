const font = 'Standard';

figlet.defaults({ fontPath: 'https://cdn.jsdelivr.net/npm/figlet/fonts' });
figlet.preloadFonts([font], ready);

const formatter = new Intl.ListFormat('en', {
    style: 'long',
    type: 'conjunction',
});

const commands = {
    help() {
        this.echo(`List of available commands: ${help}`);
    },
    chat() {
        this.push(async function (message) {
            const msg = message.trim();
            if (!msg) return;
            this.pause();
            try {
                const result = await llm_call(msg);
                try {
                    const jsonResponse = JSON.parse(result);
                    this.echo(`[[b;green;]LLM:] ${jsonResponse.reply || JSON.stringify(jsonResponse, null, 2)}`);
                } catch (e) {
                    this.echo(`[[b;green;]LLM:] ${result}`);
                }
            } catch (err) {
                this.error("LLM Call Failed: " + err.message);
            } finally {
                this.resume();
            }
        }, { prompt: "chat> ", name: "chat", onExit: () => { this.echo("Exited chat mode."); }});
    },
    code() {
        term.push(async function (command, term) {
            const cmd = command.trim();
            if (!cmd) return;
            this.pause();
            try {
                console.time("ticks");
                const tokens = tequila_lex(command.trim());
                const tree = tequila_parse(tokens);
                const results = await tequila_evaluate(tree);
                if (results.length > 0) {
                    term.echo(`=> ${results[results.length - 1]}`);
                }
                console.timeEnd("ticks");
            } catch (err) {
                term.error(String(err));
            } finally {
                this.resume();
            }
        }, { prompt: ">> ", name: "Tequila" });
    }
};

const command_list = ['clear'].concat(Object.keys(commands));
const formatted_list = command_list.map(cmd => `<white class="command">${cmd}</white>`);
const help = formatter.format(formatted_list);

const term = $('body').terminal(commands, {
    completion: true,
    greetings: 'Tequila: Yet Another Interpreter'
});

term.on('click', '.command', function () {
    const command = $(this).text();
    term.exec(command, { typing: true, delay: 50 });
});

function ready() {
    const seed = rand(256);
    term.echo(() => rainbow(render('Tequila'), seed)).resume();
}

function rainbow(string, seed) {
    return lolcat.rainbow(function (char, color) {
        char = $.terminal.escape_brackets(char);
        return `[[;${hex(color)};]${char}]`;
    }, string, seed).join('\n');
}

function rand(max) {
    return Math.floor(Math.random() * (max + 1));
}

function render(text) {
    const cols = term.cols();
    return trim(figlet.textSync(text, {
        font: font,
        width: cols,
        whitespaceBreak: true
    }));
}

function trim(str) {
    return str.replace(/[\n\s]+$/, '');
}

function hex(color) {
    return '#' + [color.red, color.green, color.blue].map(n => {
        return n.toString(16).padStart(2, '0');
    }).join('');
}
