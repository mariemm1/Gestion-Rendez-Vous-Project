// /cron/cronJobs.js
// Clean reminder job using Luxon + proper Date range queries for your schema.

const { DateTime } = require("luxon");
const RendezVous = require("../models/rendezVous");
const Notification = require("../models/notification");

/** Format a JS Date as YYYY-MM-DD for messages */
const fmtDay = (d) => DateTime.fromJSDate(d).toFormat("yyyy-LL-dd");

/** Build [startOfDay, nextDay) range from a Luxon DateTime */
function dayRange(dt) {
  const start = dt.startOf("day").toJSDate();
  const endExclusive = dt.plus({ days: 1 }).startOf("day").toJSDate(); // < next day
  return { start, endExclusive };
}

const envoyerRappels = async () => {
  const now = DateTime.now(); // baseline (never mutate)

  // --- 1) All RDVs in 2 days (any time that day), statut Confirmé ---
  const in2Days = now.plus({ days: 2 });
  const r2 = dayRange(in2Days);
  // IMPORTANT: your schema stores "date: Date" (day), not a YYYY-MM-DD string
  let rdv2Days = await RendezVous.find({
    date: { $gte: r2.start, $lt: r2.endExclusive },
    statut: "Confirmé",
  })
    // We need userId of the client to notify the *Utilisateur* (not Client)
    .populate({ path: "client_id", select: "userId" }) // client_id -> Client doc -> userId
    .select("date heure client_id")
    .lean();

  // --- 2) RDVs between ~3h45 and 4h15 from now (tolerant window) ---
  const from = now.plus({ hours: 3, minutes: 45 });
  const to = now.plus({ hours: 4, minutes: 15 });

  // Query possibly spans two calendar days; we fetch by day then filter by HH:mm
  const qStart = from.startOf("day");
  const qEnd = to.plus({ days: 1 }).startOf("day"); // exclusive
  let rdvCandidates = await RendezVous.find({
    date: { $gte: qStart.toJSDate(), $lt: qEnd.toJSDate() },
    statut: "Confirmé",
  })
    .populate({ path: "client_id", select: "userId" })
    .select("date heure client_id")
    .lean();

  const isWithinWindow = (rv) => {
    const rvDT = DateTime.fromJSDate(rv.date).set({
      hour: parseInt(rv.heure.slice(0, 2), 10),
      minute: parseInt(rv.heure.slice(3, 5), 10),
      second: 0,
      millisecond: 0,
    });
    return rvDT >= from && rvDT <= to;
  };

  const rdv4h = rdvCandidates.filter(isWithinWindow);

  // --- 3) Build notifications payloads ---
  const payloads = [
    ...rdv2Days.map((rdv) => ({
      type: "Rappel",
      role: "CLIENT",
      // IMPORTANT: utilisateur_id must be a Utilisateur _id → rdv.client_id.userId
      utilisateur_id: rdv.client_id.userId,
      message: `Rappel : Vous avez un rendez-vous dans 2 jours, le ${fmtDay(rdv.date)} à ${rdv.heure}.`,
      dateEnvoi: new Date(),
    })),
    ...rdv4h.map((rdv) => ({
      type: "Rappel",
      role: "CLIENT",
      utilisateur_id: rdv.client_id.userId,
      message: `Rappel : Vous avez un rendez-vous dans 4 heures, à ${rdv.heure}.`,
      dateEnvoi: new Date(),
    })),
  ];

  if (payloads.length) await Notification.insertMany(payloads);

  console.log(`Rappels envoyés. (2j:${rdv2Days.length}, 4h:${rdv4h.length})`);
};

module.exports = { envoyerRappels };
