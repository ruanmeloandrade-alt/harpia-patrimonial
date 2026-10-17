import { submitPropertyRegistration } from './registration-api.js';

const form = document.getElementById('registration-form');
const intro = document.getElementById('intro');
const confirmation = document.getElementById('confirmation');
const sidebar = document.getElementById('step-sidebar');
const panels = Array.from(form.querySelectorAll('.step-panel'));
const progress = Array.from(form.querySelectorAll('.step-progress li'));
const nextButton = document.getElementById('next-step');
const previousButton = document.getElementById('previous-step');
const nextLabel = document.getElementById('next-label');
const previousLabel = document.getElementById('previous-label');
const submitError = document.getElementById('submit-error');
const announcement = document.getElementById('form-announcement');
let currentStep = 0;
let submitting = false;

const steps = [
  { category: 'Identificação', eyebrow: 'O início da sua apresentação', title: ['Cada imóvel tem', 'características que', 'merecem atenção.'], description: 'Começamos pelo tipo e pela finalidade da negociação.', caption: 'Apresentação do imóvel', footnote: 'Hárpia · Apresentação do imóvel' },
  { category: 'Descrição', eyebrow: 'Os detalhes importam', title: ['A boa apresentação', 'valoriza aquilo que', 'torna o imóvel', 'singular.'], description: 'Conte o que não pode ser compreendido apenas por uma fotografia.', caption: 'Características e diferenciais', footnote: 'Hárpia · Informações do imóvel' },
  { category: 'Endereço', eyebrow: 'Leitura de localização', title: ['O endereço é parte', 'essencial do valor de', 'cada oportunidade.'], description: 'Localização, entorno e contexto fazem parte da análise inicial.', caption: 'Localização do imóvel', footnote: 'Hárpia · Localização' },
  { category: 'Expectativa', eyebrow: 'Perspectiva patrimonial', title: ['Seu valor estimado', 'é o ponto de partida', 'da conversa.'], description: 'Nossa equipe avaliará o contexto e as informações apresentadas.', caption: 'Expectativa de valor', footnote: 'Hárpia · Expectativa de valor' },
  { category: 'Contato', eyebrow: 'Atendimento personalizado', title: ['Grandes negócios', 'começam com uma', 'relação de', 'confiança.'], description: 'Depois do cadastro, a Hárpia entrará em contato pelos dados fornecidos.', caption: 'Dados do proprietário', footnote: 'Hárpia · Contato do proprietário' },
  { category: 'Conferência', eyebrow: 'Antes de enviar', title: ['Clareza em cada', 'informação.', 'Critério em cada', 'decisão.'], description: 'Revise os dados que serão enviados à equipe Hárpia para contato posterior.', caption: 'Revisão e envio', footnote: 'Hárpia · Revisão final' },
];

const stepFields = {
  1: ['propertyType', 'intent'],
  2: ['description'],
  3: ['address'],
  4: ['expectedValue'],
  5: ['ownerName', 'phone', 'secondaryPhone', 'email'],
  6: ['consent'],
};

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function parseValue(value) {
  const cleaned = String(value).replace(/R\$/gi, '').replace(/\s/g, '');
  if (!cleaned || !/^[\d.,]+$/.test(cleaned)) return NaN;
  let normalized;
  if (cleaned.includes(',')) {
    if (!/^\d[\d.]*,\d{1,2}$/.test(cleaned)) return NaN;
    const [whole, decimals] = cleaned.split(',');
    if (whole.includes('.') && !/^\d{1,3}(\.\d{3})+$/.test(whole)) return NaN;
    normalized = `${whole.replace(/\./g, '')}.${decimals}`;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '');
  } else if (/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    normalized = cleaned;
  } else {
    return NaN;
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : NaN;
}

function readData() {
  const values = new FormData(form);
  const get = (name) => String(values.get(name) || '').trim();
  return {
    propertyType: get('propertyType'),
    intent: get('intent'),
    description: get('description'),
    address: get('address'),
    expectedValue: parseValue(get('expectedValue')),
    ownerName: get('ownerName'),
    phone: get('phone'),
    secondaryPhone: get('secondaryPhone'),
    email: get('email'),
    consent: form.elements.consent.checked,
  };
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderReview() {
  const data = readData();
  const intentLabel = data.intent === 'venda' ? 'Venda' : 'Aluguel';
  setText('review-property', `${data.propertyType} · ${intentLabel}`);
  setText('review-description', data.description);
  setText('review-address', data.address);
  setText('review-value', brl.format(data.expectedValue));
  setText('review-owner', data.ownerName);
  setText('review-contacts', [data.phone, data.secondaryPhone, data.email].filter(Boolean).join('\n'));
}

function showStep(step, shouldFocus = true) {
  currentStep = step;
  const isIntro = step === 0;
  const isConfirmation = step === 7;
  intro.hidden = !isIntro;
  form.hidden = isIntro || isConfirmation;
  confirmation.hidden = !isConfirmation;
  submitError.hidden = true;
  submitError.textContent = '';
  if (!isIntro && !isConfirmation) {
    const config = steps[step - 1];
    const number = String(step).padStart(2, '0');
    panels.forEach((panel) => { panel.hidden = Number(panel.dataset.step) !== step; });
    sidebar.className = `step-sidebar sidebar-${step}`;
    setText('sidebar-eyebrow', config.eyebrow);
    setText('sidebar-number', number);
    const title = document.getElementById('sidebar-title');
    title.replaceChildren();
    config.title.forEach((line, index) => {
      if (index) title.append(document.createElement('br'), document.createTextNode(' '));
      title.append(document.createTextNode(line));
    });
    setText('sidebar-description', config.description);
    setText('sidebar-caption', config.caption);
    setText('sidebar-footnote', config.footnote);
    setText('step-category', config.category);
    setText('step-counter', `${number} de 06`);
    progress.forEach((item, index) => {
      item.classList.toggle('complete', index < step - 1);
      if (index === step - 1) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    previousLabel.textContent = step === 1 ? 'Voltar ao início' : step === 6 ? 'Revisar etapa anterior' : 'Etapa anterior';
    nextLabel.textContent = step === 6 ? 'Enviar cadastro do imóvel' : step === 5 ? 'Revisar informações' : 'Próxima etapa';
    nextLabel.dataset.final = String(step === 6);
    if (step === 6) renderReview();
    announcement.textContent = `Etapa ${step} de 6: ${config.category}.`;
  }
  if (shouldFocus) {
    const target = document.getElementById(isIntro ? 'intro-title' : isConfirmation ? 'confirmation-title' : `step-title-${step}`);
    requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }
}

function fieldControls(name) {
  return Array.from(form.querySelectorAll(`[name="${name}"]`));
}

function clearError(name) {
  const node = document.getElementById(`error-${name}`);
  if (node) { node.hidden = true; node.textContent = ''; }
  fieldControls(name).forEach((control) => { control.removeAttribute('aria-invalid'); });
}

function fieldError(name, message) {
  const node = document.getElementById(`error-${name}`);
  node.textContent = message;
  node.hidden = false;
  fieldControls(name).forEach((control) => { control.setAttribute('aria-invalid', 'true'); });
}

function validPhone(value) {
  if (!/^[+\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  if (/^\+/.test(value.trim())) return digits.length >= 8 && digits.length <= 15;
  return /^\d{10,11}$/.test(digits) || /^55\d{10,11}$/.test(digits);
}

function validateStep(step, focus = true) {
  const data = readData();
  const errors = [];
  for (const name of stepFields[step]) clearError(name);
  const add = (name, message) => { errors.push(name); fieldError(name, message); };
  if (step === 1) {
    if (!data.propertyType) add('propertyType', 'Selecione o tipo do seu imóvel.');
    if (!data.intent) add('intent', 'Selecione venda ou aluguel.');
  }
  if (step === 2 && !data.description) add('description', 'Descreva as características do seu imóvel.');
  if (step === 3 && !data.address) add('address', 'Informe o endereço do imóvel.');
  if (step === 4 && (!Number.isFinite(data.expectedValue) || data.expectedValue <= 0 || data.expectedValue > 999999999999.99)) {
    add('expectedValue', 'Informe um valor válido em reais, maior que zero.');
  }
  if (step === 5) {
    if (!data.ownerName) add('ownerName', 'Informe o nome do proprietário.');
    if (!data.phone) add('phone', 'Informe o celular principal com DDD.');
    else if (!validPhone(data.phone)) add('phone', 'Confira o número do celular principal, incluindo o DDD.');
    if (data.secondaryPhone && !validPhone(data.secondaryPhone)) add('secondaryPhone', 'Confira o segundo celular, incluindo o DDD, ou deixe o campo vazio.');
    if (data.email && !form.elements.email.validity.valid) add('email', 'Informe um e-mail válido ou deixe o campo vazio.');
  }
  if (step === 6 && !data.consent) add('consent', 'Autorize a utilização dos dados e o contato para enviar seu cadastro.');
  if (errors.length && focus) {
    const target = fieldControls(errors[0])[0];
    target.focus();
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    announcement.textContent = 'Confira os campos indicados antes de continuar.';
  }
  return errors.length === 0;
}

function setSubmitting(value) {
  submitting = value;
  form.setAttribute('aria-busy', String(value));
  nextButton.disabled = value;
  previousButton.disabled = value;
  form.querySelectorAll('[data-edit-step]').forEach((button) => { button.disabled = value; });
  if (value) {
    nextLabel.textContent = 'Enviando...';
    announcement.textContent = 'Enviando as informações do imóvel. Aguarde.';
  } else if (currentStep === 6) {
    nextLabel.textContent = 'Enviar cadastro do imóvel';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting || currentStep < 1 || currentStep > 6) return;
  if (!validateStep(currentStep)) return;
  if (currentStep < 6) {
    showStep(currentStep + 1);
    return;
  }
  for (let step = 1; step <= 5; step += 1) {
    if (!validateStep(step, false)) {
      showStep(step);
      validateStep(step);
      return;
    }
  }
  submitError.hidden = true;
  submitError.textContent = '';
  const data = readData();
  setSubmitting(true);
  try {
    const result = await submitPropertyRegistration(data);
    if (!result || result.ok !== true) {
      throw new Error('Não foi possível confirmar o recebimento do cadastro. Tente novamente.');
    }
    showStep(7);
    form.reset();
    announcement.textContent = 'Informações recebidas pela Hárpia.';
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Não foi possível enviar o cadastro agora. Seus dados continuam preenchidos. Tente novamente.';
    submitError.textContent = message;
    submitError.hidden = false;
    submitError.focus();
    submitError.scrollIntoView({ block: 'center', behavior: 'smooth' });
    announcement.textContent = 'O envio não foi confirmado. Seus dados permanecem preenchidos.';
  } finally {
    setSubmitting(false);
  }
});

document.getElementById('start-registration').addEventListener('click', () => showStep(1));
previousButton.addEventListener('click', () => { if (!submitting) showStep(Math.max(0, currentStep - 1)); });
form.querySelectorAll('[data-edit-step]').forEach((button) => {
  button.addEventListener('click', () => { if (!submitting) showStep(Number(button.dataset.editStep)); });
});
form.addEventListener('input', (event) => {
  if (event.target.name) clearError(event.target.name);
  if (!submitError.hidden) { submitError.hidden = true; submitError.textContent = ''; }
});
form.addEventListener('change', (event) => {
  if (event.target.name) clearError(event.target.name);
});
form.elements.expectedValue.addEventListener('blur', (event) => {
  const amount = parseValue(event.target.value);
  if (Number.isFinite(amount) && amount > 0) event.target.value = brl.format(amount);
});
for (const name of ['phone', 'secondaryPhone']) {
  form.elements[name].addEventListener('blur', (event) => {
    const value = event.target.value.trim();
    const digits = value.replace(/\D/g, '');
    if (!value.startsWith('+') && (digits.length === 10 || digits.length === 11)) {
      const prefixLength = digits.length - 6;
      event.target.value = `(${digits.slice(0, 2)}) ${digits.slice(2, prefixLength + 2)}-${digits.slice(-4)}`;
    }
  });
}
