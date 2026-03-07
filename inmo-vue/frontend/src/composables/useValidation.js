// composables/useValidation.js
// Validaciones reutilizables para todos los formularios

export function useValidation() {

  const rules = {
    required: (v) => (v !== null && v !== undefined && String(v).trim() !== '') || 'Este campo es obligatorio.',
    email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido.',
    minLen: (min) => (v) => !v || String(v).trim().length >= min || `Mínimo ${min} caracteres.`,
    maxLen: (max) => (v) => !v || String(v).trim().length <= max || `Máximo ${max} caracteres.`,
    positive: (v) => !v || Number(v) > 0 || 'Debe ser mayor que 0.',
    min: (min) => (v) => !v || Number(v) >= min || `Mínimo ${min}.`,
    password: (v) => {
      if (!v) return 'La contraseña es obligatoria.';
      if (v.length < 8) return 'Mínimo 8 caracteres.';
      if (!/[a-zA-Z]/.test(v)) return 'Debe contener al menos una letra.';
      if (!/[0-9]/.test(v)) return 'Debe contener al menos un número.';
      return true;
    },
    phone: (v) => !v || /^[\d\s\-\+\(\)]{8,}$/.test(v) || 'Teléfono inválido (mínimo 8 dígitos).',
    dateRange: (start, end) => {
      if (!start || !end) return true;
      return new Date(start) < new Date(end) || 'La fecha de inicio debe ser anterior a la fecha de fin.';
    },
  };

  // Valida un objeto de campos con sus reglas
  // Retorna { valid: boolean, errors: { campo: 'mensaje' } }
  function validate(fields) {
    const errors = {};
    for (const [field, { value, rules: fieldRules }] of Object.entries(fields)) {
      for (const rule of fieldRules) {
        const result = rule(value);
        if (result !== true) {
          errors[field] = result;
          break;
        }
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  return { rules, validate };
}

export default useValidation;
