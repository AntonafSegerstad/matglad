export function setupChat({ document: doc, send, onError = () => {} }) {
  const toggle = doc.getElementById('chat-toggle');
  const panel = doc.getElementById('chat-panel');
  const form = doc.getElementById('chat-form');
  const input = doc.getElementById('chat-text');
  const submit = doc.getElementById('chat-send');
  const messages = doc.getElementById('chat-messages');
  const close = doc.getElementById('chat-close');
  const errorText = doc.getElementById('chat-error');
  let history = [], pending = false;

  function setOpen(open, restoreFocus = true) {
    panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
    doc.body.classList.toggle('dialog-open', open);
    if (open) input.focus({ preventScroll: true });
    else {
      input.blur();
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false));
  panel.addEventListener('click', event => { if (event.target === panel) setOpen(false); });
  doc.addEventListener('keydown', event => {
    if (panel.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    if (event.key === 'Tab') {
      const controls = [...panel.querySelectorAll('button,textarea,input,select')].filter(control => !control.disabled && !control.hidden);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });

  function appendMessage(role, content) {
    const bubble = doc.createElement('div'); bubble.className = `chat-message ${role}`;
    const speaker = doc.createElement('span'); speaker.className = 'chat-speaker'; speaker.textContent = role === 'user' ? 'Du' : 'Matglad';
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
    panel.setAttribute('aria-busy', 'true'); errorText.hidden = true;
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
      errorText.textContent = error.message; errorText.hidden = false;
      onError(error.message);
    } finally {
      pending = false; input.disabled = false; submit.disabled = false;
      panel.setAttribute('aria-busy', 'false');
      if (!panel.hidden) input.focus({ preventScroll: true });
    }
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!pending) form.requestSubmit();
    }
  });
  return {
    addExchange(text, reply) {
      appendMessage('user', text); appendMessage('assistant', reply);
      history = [...history, { role: 'user', content: text.slice(0, 4000) }, { role: 'assistant', content: reply.slice(0, 4000) }].slice(-10);
    },
    reset() {
      history = []; messages.replaceChildren(); input.value = '';
      errorText.hidden = true; setOpen(false, false);
    }
  };
}
