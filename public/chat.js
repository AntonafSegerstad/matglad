export function setupChat({ document: doc, send, onError = () => {} }) {
  const toggle = doc.getElementById('chat-toggle');
  const panel = doc.getElementById('chat-panel');
  const form = doc.getElementById('chat-form');
  const input = doc.getElementById('chat-text');
  const submit = doc.getElementById('chat-send');
  const messages = doc.getElementById('chat-messages');
  let history = [], pending = false;

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  });

  function appendMessage(role, content) {
    const bubble = doc.createElement('div'); bubble.className = `chat-message ${role}`;
    const speaker = doc.createElement('span'); speaker.className = 'chat-speaker'; speaker.textContent = role === 'user' ? 'Du' : 'HomeHelper';
    const text = doc.createElement('p'); text.textContent = content;
    bubble.append(speaker, text); messages.append(bubble);
    while (messages.children.length > 20) messages.firstElementChild.remove();
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || pending) return;
    pending = true; input.disabled = true; submit.disabled = true;
    panel.setAttribute('aria-busy', 'true');
    const bubble = appendMessage('user', text);
    try {
      const reply = await send({ text, history: history.slice(-10) });
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('AI:n gav inget svar. Försök igen.');
      appendMessage('assistant', reply);
      history = [...history, { role: 'user', content: text }, { role: 'assistant', content: reply.slice(0, 4000) }].slice(-10);
      input.value = '';
    } catch (error) {
      // Keep the draft so failed requests can be corrected or retried.
      bubble.remove();
      onError(error.message);
    } finally {
      pending = false; input.disabled = false; submit.disabled = false;
      panel.setAttribute('aria-busy', 'false');
      input.focus();
    }
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!pending) form.requestSubmit();
    }
  });
  return {
    reset() {
      history = []; messages.replaceChildren(); input.value = '';
      panel.hidden = true; toggle.setAttribute('aria-expanded', 'false');
    }
  };
}
