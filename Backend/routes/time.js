// Build 30-min (or custom) slots between two HH:mm times
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(min) {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}
function buildSlots(startHHMM, endHHMM, stepMin = 30) {
  const start = toMinutes(startHHMM);
  const end = toMinutes(endHHMM);
  const out = [];
  for (let t = start; t + stepMin <= end; t += stepMin) out.push(fromMinutes(t));
  return out;
}

module.exports = { toMinutes, fromMinutes, buildSlots };
