/** Body-composition estimates from self-taken tape (cm) and skinfolds (mm). */

const CM_PER_INCH = 2.54;

export function num(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function waistHipRatio(waistCm, hipsCm) {
  const w = num(waistCm);
  const h = num(hipsCm);
  if (w === null || h === null || h <= 0) return null;
  return w / h;
}

function siriPercent(density) {
  if (density === null || density <= 0) return null;
  return 495 / density - 450;
}

/** Jackson–Pollock 3-site. Men: chest, abdomen, thigh. Women: triceps, suprailiac, thigh. */
export function jacksonPollock3(sex, age, skinfolds) {
  const a = num(age);
  if (!sex || a === null) return null;
  const s = skinfolds || {};
  let sum;
  let density;
  if (sex === "male") {
    const chest = num(s.chest);
    const abdomen = num(s.abdomen);
    const thigh = num(s.thigh);
    if (chest === null || abdomen === null || thigh === null) return null;
    sum = chest + abdomen + thigh;
    density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * a;
  } else if (sex === "female") {
    const triceps = num(s.triceps);
    const suprailiac = num(s.suprailiac);
    const thigh = num(s.thigh);
    if (triceps === null || suprailiac === null || thigh === null) return null;
    sum = triceps + suprailiac + thigh;
    density = 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * a;
  } else {
    return null;
  }
  const percent = siriPercent(density);
  if (percent === null || percent < 2 || percent > 70) return null;
  return { percent, density, sum, method: "jp3" };
}

/** Jackson–Pollock 7-site: chest, midaxillary, triceps, subscapular, abdomen, suprailiac, thigh. */
export function jacksonPollock7(sex, age, skinfolds) {
  const a = num(age);
  if (!sex || a === null) return null;
  const keys = [
    "chest",
    "midaxillary",
    "triceps",
    "subscapular",
    "abdomen",
    "suprailiac",
    "thigh",
  ];
  const s = skinfolds || {};
  const values = keys.map((k) => num(s[k]));
  if (values.some((v) => v === null)) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  let density;
  if (sex === "male") {
    density = 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * a;
  } else if (sex === "female") {
    density = 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * a;
  } else {
    return null;
  }
  const percent = siriPercent(density);
  if (percent === null || percent < 2 || percent > 70) return null;
  return { percent, density, sum, method: "jp7" };
}

/** US Navy tape method. Inputs in cm; converted to inches internally. */
export function navyBodyFat(sex, heightCm, tape) {
  const heightIn = num(heightCm) / CM_PER_INCH;
  const neck = num(tape?.neck) / CM_PER_INCH;
  const waist = num(tape?.waist) / CM_PER_INCH;
  const hips = num(tape?.hips) / CM_PER_INCH;
  if (!Number.isFinite(heightIn) || !Number.isFinite(neck) || !Number.isFinite(waist)) {
    return null;
  }
  let percent;
  if (sex === "male") {
    const diff = waist - neck;
    if (diff <= 0) return null;
    percent = 86.01 * Math.log10(diff) - 70.041 * Math.log10(heightIn) + 36.76;
  } else if (sex === "female") {
    if (!Number.isFinite(hips)) return null;
    const sum = waist + hips - neck;
    if (sum <= 0) return null;
    percent = 163.205 * Math.log10(sum) - 97.684 * Math.log10(heightIn) - 78.387;
  } else {
    return null;
  }
  if (!Number.isFinite(percent) || percent < 2 || percent > 70) return null;
  return { percent, method: "navy" };
}

export function bestEstimate(profile, log) {
  const jp7 = jacksonPollock7(profile?.sex, profile?.age, log?.skinfolds);
  if (jp7) return jp7;
  const jp3 = jacksonPollock3(profile?.sex, profile?.age, log?.skinfolds);
  if (jp3) return jp3;
  const navy = navyBodyFat(profile?.sex, profile?.heightCm, log?.tape);
  if (navy) return navy;
  return null;
}

export function availableMethods(profile, log) {
  return {
    jp7: jacksonPollock7(profile?.sex, profile?.age, log?.skinfolds),
    jp3: jacksonPollock3(profile?.sex, profile?.age, log?.skinfolds),
    navy: navyBodyFat(profile?.sex, profile?.heightCm, log?.tape),
    whr: waistHipRatio(log?.tape?.waist, log?.tape?.hips),
  };
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function formatRatio(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(2);
}

export function methodLabel(method) {
  if (method === "jp7") return "Jackson–Pollock 7-site";
  if (method === "jp3") return "Jackson–Pollock 3-site";
  if (method === "navy") return "US Navy tape";
  return "Estimate";
}
