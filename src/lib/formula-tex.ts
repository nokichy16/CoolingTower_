/**
 * The formulas in the calculated-values table, written in TeX so they show
 * as mathematical notation. Keys are the plain-text formulas used in the
 * table; text that is not a formula (for example "from stage 2") has no
 * entry and stays as text.
 */
export const FORMULA_TEX: Record<string, string> = {
  'p_sat = 610.94·exp(17.625T / (T + 243.04))':
    'p_{\\mathrm{sat}} = 610.94\\,\\exp\\!\\left(\\dfrac{17.625\\,T}{T + 243.04}\\right)',
  'p_v = RH·p_sat': 'p_v = \\mathit{RH}\\cdot p_{\\mathrm{sat}}',
  'ω = 0.622·p_v / (P − p_v)': '\\omega = \\dfrac{0.622\\,p_v}{P - p_v}',
  'T_dew : p_sat(T_dew) = p_v': 'p_{\\mathrm{sat}}(T_{\\mathrm{dew}}) = p_v',
  'h = 1.006T + ω(2501 + 1.86T)': 'h = 1.006\\,T + \\omega\\,(2501 + 1.86\\,T)',
  'ρ = (1 + ω)P / (R_da·T(1 + 1.608ω))':
    '\\rho = \\dfrac{(1 + \\omega)\\,P}{R_{\\mathrm{da}}\\,T\\,(1 + 1.608\\,\\omega)}',
  'V̇ = A·u': '\\dot V = A\\,u',
  'ṁ_da = ρV̇ / (1 + ω)': '\\dot m_{\\mathrm{da}} = \\dfrac{\\rho\\,\\dot V}{1 + \\omega}',
  'ṁ_drift,in = ṁ_circ·D_in / 100':
    '\\dot m_{\\mathrm{in}} = \\dfrac{\\dot m_{\\mathrm{circ}}\\,D_{\\mathrm{in}}}{100}',
  'μ = ln E − σ²/2': '\\mu = \\ln E - \\dfrac{\\sigma^2}{2}',
  'd_med = e^μ': 'd_{\\mathrm{med}} = e^{\\mu}',
  'Sutherland: μ = 1.458e-6·T^1.5 / (T + 110.4)':
    '\\mu = \\dfrac{1.458\\times10^{-6}\\,T^{1.5}}{T + 110.4}',
  'Re = ρuL / μ': '\\mathrm{Re} = \\dfrac{\\rho\\,u\\,L}{\\mu}',
  'Kp = f(Re, geometry)  (Ruiz 2019)': 'K_p = f(\\mathrm{Re},\\ \\text{geometry})',
  'St = ρ_w·u·d² / (18μL)': '\\mathrm{St} = \\dfrac{\\rho_w\\,u\\,d^2}{18\\,\\mu\\,L}',
  'Δp = Kp·½ρu²': '\\Delta p = K_p\\,\\tfrac{1}{2}\\rho u^2',
  'η_esc = ∫(1 − ε(d)) dF(d)': '\\eta_{\\mathrm{esc}} = \\int \\big(1 - \\varepsilon(d)\\big)\\,dF(d)',
  '1 − η_esc = ∫ε(d) dF(d)': '1 - \\eta_{\\mathrm{esc}} = \\int \\varepsilon(d)\\,dF(d)',
  'ṁ_esc = ṁ_drift,in·η_esc': '\\dot m_{\\mathrm{esc}} = \\dot m_{\\mathrm{in}}\\,\\eta_{\\mathrm{esc}}',
  'ṁ_cap = ṁ_drift,in·(1 − η_esc)':
    '\\dot m_{\\mathrm{cap}} = \\dot m_{\\mathrm{in}}\\,(1 - \\eta_{\\mathrm{esc}})',
  'P = V̇·Δp': 'P = \\dot V\\,\\Delta p',
  'T₅ = T_dew − ΔT_dew  (saturated)': 'T_5 = T_{\\mathrm{dew}} - \\Delta T_{\\mathrm{dew}}',
  'ω₅ = ω_sat(T₅)': '\\omega_5 = \\omega_{\\mathrm{sat}}(T_5)',
  'h₅ = h_sat(T₅)': 'h_5 = h_{\\mathrm{sat}}(T_5)',
  'Δω = ω₄ − ω₅': '\\Delta\\omega = \\omega_4 - \\omega_5',
  'Δh = h₄ − h₅': '\\Delta h = h_4 - h_5',
  'ṁ_cond = ṁ_da·Δω': '\\dot m_{\\mathrm{cond}} = \\dot m_{\\mathrm{da}}\\,\\Delta\\omega',
  'Q = ṁ_da·Δh': 'Q = \\dot m_{\\mathrm{da}}\\,\\Delta h',
  'e = Δh / Δω': 'e = \\dfrac{\\Delta h}{\\Delta\\omega}',
  'B/E = 1 / (CoC − 1)': 'B/E = \\dfrac{1}{\\mathit{CoC} - 1}',
}

/** Text shown after a rendered formula, where the plain version had a note. */
export const FORMULA_NOTE: Record<string, string> = {
  'Sutherland: μ = 1.458e-6·T^1.5 / (T + 110.4)': 'Sutherland',
  'Kp = f(Re, geometry)  (Ruiz 2019)': 'Ruiz 2019',
  'T₅ = T_dew − ΔT_dew  (saturated)': 'saturated',
}
