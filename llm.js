const apiKeyInput = document.getElementById('apiKey');

window.onload = () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }
};

apiKeyInput.addEventListener('change', () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.value);
});

async function llm_call(prompt) {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const model = "llama-3.1-8b-instant";
    const apiKey = apiKeyInput.value;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt + " (output JSON only)" }],
            temperature: 1,
            max_completion_tokens: 1024,
            top_p: 1,
            stream: false,
            stop: null,
            response_format: { type: "json_object" }
        })
    });
    const data = await response.json();
    result = data.choices[0].message.content;
    console.log(JSON.stringify(result));
    return result;
}