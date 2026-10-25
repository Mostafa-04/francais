import { useEffect, useMemo, useRef, useState } from "react";

import plan from "./data.json";

/* ----------------------------- Storage ----------------------------- */
const KEY = "french30_progress_v1";
const DEFAULT = { completed: [], reviewChecks: {}, forgotten: {}, spokenDone: {} };

const loadProgress = () => {
  try {
    return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY)) || {}) };
  } catch {
    return DEFAULT;
  }
};

/* ----------------------------- Helpers ----------------------------- */
const speak = (text) => {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const todayISO = () => new Date().toISOString().slice(0, 10);

/* ------------------------------- App ------------------------------- */
export default function FrenchPlan() {
  const [progress, setProgress] = useState(loadProgress);
  const [view, setView] = useState({ name: "home" }); // home | lesson | forgotten

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {}
  }, [progress]);

  const lessons = plan.lessons;
  const isDone = (d) => progress.completed.includes(d);
  const isUnlocked = (d) => d === 1 || isDone(d - 1);
  const nextDay = lessons.find((l) => !isDone(l.day))?.day ?? null;

  const update = (patch) => setProgress((p) => ({ ...p, ...patch }));

  const completeLesson = (day) =>
    update({ completed: [...new Set([...progress.completed, day])] });

  const toggleForgotten = (day, word) => {
    const k = `${day}|${word}`;
    const next = { ...progress.forgotten };
    next[k] ? delete next[k] : (next[k] = true);
    update({ forgotten: next });
  };

  const resetAll = () => {
    if (window.confirm("Effacer toute la progression ?")) setProgress(DEFAULT);
  };

  return (
    <div className="min-h-screen bg-[#f4f1ec] text-[#1b2433]">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        {view.name === "home" && (
          <Home
            lessons={lessons}
            progress={progress}
            isDone={isDone}
            isUnlocked={isUnlocked}
            nextDay={nextDay}
            open={(day) => setView({ name: "lesson", day })}
            openForgotten={() => setView({ name: "forgotten" })}
            reset={resetAll}
          />
        )}

        {view.name === "lesson" && (
          <Lesson
            key={view.day}
            lesson={lessons[view.day - 1]}
            prevLesson={view.day > 1 ? lessons[view.day - 2] : null}
            progress={progress}
            update={update}
            done={isDone(view.day)}
            complete={() => completeLesson(view.day)}
            toggleForgotten={toggleForgotten}
            back={() => setView({ name: "home" })}
            goNext={() =>
              view.day < lessons.length
                ? setView({ name: "lesson", day: view.day + 1 })
                : setView({ name: "home" })
            }
          />
        )}

        {view.name === "forgotten" && (
          <Forgotten
            lessons={lessons}
            progress={progress}
            toggleForgotten={toggleForgotten}
            back={() => setView({ name: "home" })}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Home ------------------------------- */
function Home({ lessons, progress, isDone, isUnlocked, nextDay, open, openForgotten, reset }) {
  const doneCount = progress.completed.length;
  const pct = Math.round((doneCount / lessons.length) * 100);
  const forgottenCount = Object.keys(progress.forgotten).length;

  return (
    <>
      <header className="mb-8 border-b-2 border-[#1b2433] pb-6">
        <p className="text-sm text-[#5b6577]">
          {fmtDate(plan.startDate)} – {fmtDate(plan.endDate)} · niveau débutant
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold leading-tight sm:text-5xl">
          {plan.planTitle}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="min-w-[220px] flex-1">
            <div className="mb-1 flex justify-between text-sm font-medium">
              <span>
                {doneCount} / {lessons.length} leçons
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#dcd6cb]">
              <div
                className="h-full rounded-full bg-[#0f766e] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {nextDay && (
            <button
              onClick={() => open(nextDay)}
              className="rounded-lg bg-[#1b2433] px-5 py-3 font-semibold text-white hover:bg-[#2b3a55] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#e9a820]"
            >
              {doneCount === 0 ? "Commencer le jour 1" : `Continuer : jour ${nextDay}`}
            </button>
          )}
          {!nextDay && (
            <p className="font-semibold text-[#0f766e]">
              Plan terminé. Bravo, continue à pratiquer chaque jour.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <button
            onClick={openForgotten}
            className="rounded-md border border-[#1b2433] px-3 py-1.5 hover:bg-white"
          >
            Mots à revoir ({forgottenCount})
          </button>
          <button onClick={reset} className="px-3 py-1.5 text-[#8a3b2e] underline">
            Réinitialiser
          </button>
        </div>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((l) => {
          const done = isDone(l.day);
          const unlocked = isUnlocked(l.day);
          const isToday = l.date === todayISO();
          const isNext = l.day === nextDay;
          return (
            <li key={l.day}>
              <button
                disabled={!unlocked}
                onClick={() => open(l.day)}
                className={[
                  "flex h-full w-full flex-col rounded-xl border-2 p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#e9a820]",
                  done
                    ? "border-[#0f766e] bg-[#e4f1ee]"
                    : isNext
                    ? "border-[#e9a820] bg-white shadow-md"
                    : unlocked
                    ? "border-[#c9c2b4] bg-white hover:border-[#1b2433]"
                    : "cursor-not-allowed border-dashed border-[#c9c2b4] bg-transparent opacity-60",
                ].join(" ")}
              >
                <div className="flex items-center justify-between text-sm text-[#5b6577]">
                  <span className="font-semibold text-[#1b2433]">Jour {l.day}</span>
                  <span>
                    {fmtDate(l.date)}
                    {isToday && " · aujourd'hui"}
                  </span>
                </div>
                <h2 className="mt-2 font-serif text-lg font-bold leading-snug">{l.title}</h2>
                <p className="mt-auto pt-3 text-sm">
                  {done
                    ? "Terminé ✓"
                    : !unlocked
                    ? `Termine d'abord le jour ${l.day - 1}`
                    : isNext
                    ? "À faire maintenant"
                    : "Disponible"}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ------------------------------ Lesson ------------------------------ */
const TABS = [
  { id: "review", label: "1. Révision" },
  { id: "vocab", label: "2. Vocabulaire" },
  { id: "phrases", label: "3. Phrases" },
  { id: "speak", label: "4. Oral" },
];

function Lesson({
  lesson,
  prevLesson,
  progress,
  update,
  done,
  complete,
  toggleForgotten,
  back,
  goNext,
}) {
  const [tab, setTab] = useState(prevLesson ? "review" : "vocab");
  const tabs = prevLesson ? TABS : TABS.filter((t) => t.id !== "review");

  const reviewTasks = lesson.review.reviewTasks;
  const checks = progress.reviewChecks[lesson.day] || [];
  const reviewComplete = !prevLesson || reviewTasks.every((_, i) => checks[i]);
  const spoken = !!progress.spokenDone[lesson.day];
  const canFinish = reviewComplete && spoken;

  const toggleCheck = (i) => {
    const next = [...checks];
    next[i] = !next[i];
    update({ reviewChecks: { ...progress.reviewChecks, [lesson.day]: next } });
  };

  return (
    <>
      <button onClick={back} className="mb-4 text-sm underline">
        ← Toutes les leçons
      </button>

      <header className="mb-6">
        <p className="text-sm text-[#5b6577]">
          Jour {lesson.day} · {fmtDate(lesson.date)}
        </p>
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">{lesson.title}</h1>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Étapes de la leçon">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "rounded-full border-2 px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-[#e9a820]",
              tab === t.id
                ? "border-[#1b2433] bg-[#1b2433] text-white"
                : "border-[#c9c2b4] bg-white hover:border-[#1b2433]",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "review" && prevLesson && (
        <section>
          <h2 className="mb-1 font-serif text-xl font-bold">
            Révise le jour {prevLesson.day} : {prevLesson.title}
          </h2>
          <p className="mb-4 text-sm text-[#5b6577]">
            Fais chaque exercice à voix haute, puis coche-le. Les mots sont cachés : essaie de
            les retrouver avant de regarder.
          </p>

          <ul className="mb-6 space-y-2">
            {reviewTasks.map((task, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#c9c2b4] bg-white p-3">
                  <input
                    type="checkbox"
                    checked={!!checks[i]}
                    onChange={() => toggleCheck(i)}
                    className="mt-1 h-5 w-5 accent-[#0f766e]"
                  />
                  <span className={checks[i] ? "text-[#5b6577] line-through" : ""}>{task}</span>
                </label>
              </li>
            ))}
          </ul>

          <details className="rounded-lg border border-[#c9c2b4] bg-white p-4">
            <summary className="cursor-pointer font-semibold">
              Revoir le contenu du jour {prevLesson.day}
            </summary>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold">Mots</h3>
                <ul className="space-y-1 text-sm">
                  {prevLesson.vocabulary.map((v) => (
                    <li key={v.french} className="flex justify-between gap-2">
                      <span>{v.french}</span>
                      <span dir="rtl" className="text-[#5b6577]">
                        {v.arabic}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Phrases</h3>
                <ul className="space-y-2 text-sm">
                  {prevLesson.phrases.map((p) => (
                    <li key={p.french}>
                      <div>{p.french}</div>
                      <div dir="rtl" className="text-[#5b6577]">
                        {p.arabic}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>

          <NextButton onClick={() => setTab("vocab")}>Passer au vocabulaire</NextButton>
        </section>
      )}

      {tab === "vocab" && (
        <section>
          <TranslationHint />
          <ul className="grid gap-3 md:grid-cols-2">
            {lesson.vocabulary.map((v) => (
              <Card
                key={v.french}
                fr={v.french}
                ar={v.arabic}
                example={v.example}
                forgotten={!!progress.forgotten[`${lesson.day}|${v.french}`]}
                onForgot={() => toggleForgotten(lesson.day, v.french)}
              />
            ))}
          </ul>
          <NextButton onClick={() => setTab("phrases")}>Passer aux phrases</NextButton>
        </section>
      )}

      {tab === "phrases" && (
        <section>
          <TranslationHint />
          <ul className="grid gap-3 md:grid-cols-2">
            {lesson.phrases.map((p) => (
              <Card
                key={p.french}
                fr={p.french}
                ar={p.arabic}
                forgotten={!!progress.forgotten[`${lesson.day}|${p.french}`]}
                onForgot={() => toggleForgotten(lesson.day, p.french)}
              />
            ))}
          </ul>
          <NextButton onClick={() => setTab("speak")}>Passer à l'oral</NextButton>
        </section>
      )}

      {tab === "speak" && (
        <section>
          <div className="mb-6 rounded-xl border-2 border-[#e9a820] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Exercice oral</h2>
            <p className="mt-2 text-lg">{lesson.speakingTask}</p>
          </div>

          <Recorder />

          <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-lg border border-[#c9c2b4] bg-white p-3">
            <input
              type="checkbox"
              checked={spoken}
              onChange={() =>
                update({ spokenDone: { ...progress.spokenDone, [lesson.day]: !spoken } })
              }
              className="h-5 w-5 accent-[#0f766e]"
            />
            <span>J'ai fait l'exercice oral à voix haute.</span>
          </label>

          <div className="mt-6 border-t border-[#c9c2b4] pt-6">
            {done ? (
              <div className="flex flex-wrap items-center gap-4">
                <p className="font-semibold text-[#0f766e]">Leçon terminée ✓</p>
                <button
                  onClick={goNext}
                  className="rounded-lg bg-[#1b2433] px-5 py-3 font-semibold text-white"
                >
                  Leçon suivante
                </button>
              </div>
            ) : (
              <>
                <button
                  disabled={!canFinish}
                  onClick={() => {
                    complete();
                  }}
                  className="rounded-lg bg-[#0f766e] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Terminer la leçon
                </button>
                {!canFinish && (
                  <p className="mt-2 text-sm text-[#5b6577]">
                    {!reviewComplete && "Termine d'abord la révision du jour précédent. "}
                    {!spoken && "Coche l'exercice oral."}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function NextButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="mt-6 rounded-lg border-2 border-[#1b2433] px-5 py-2.5 font-semibold hover:bg-[#1b2433] hover:text-white"
    >
      {children}
    </button>
  );
}

function TranslationHint() {
  return (
    <p className="mb-4 text-sm text-[#5b6577]">
      Lis le français, dis-le à voix haute, puis clique sur « Traduction » pour vérifier. Si tu as
      oublié, clique sur « À revoir ».
    </p>
  );
}

/* ------------------------------- Card ------------------------------- */
function Card({ fr, ar, example, forgotten, onForgot }) {
  const [show, setShow] = useState(false);
  return (
    <li
      className={[
        "rounded-xl border-2 bg-white p-4",
        forgotten ? "border-[#c2410c]" : "border-[#c9c2b4]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-lg font-bold">{fr}</p>
        <button
          onClick={() => speak(fr)}
          aria-label={`Écouter : ${fr}`}
          className="shrink-0 rounded-md border border-[#c9c2b4] px-2 py-1 text-sm hover:bg-[#f4f1ec]"
        >
          🔊
        </button>
      </div>

      {example && <p className="mt-1 text-sm italic text-[#5b6577]">{example}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShow((s) => !s)}
          className="rounded-md bg-[#1b2433] px-3 py-1.5 text-sm font-semibold text-white"
        >
          {show ? "Cacher" : "Traduction"}
        </button>
        <button
          onClick={onForgot}
          className={[
            "rounded-md border px-3 py-1.5 text-sm font-semibold",
            forgotten
              ? "border-[#c2410c] bg-[#c2410c] text-white"
              : "border-[#c2410c] text-[#c2410c]",
          ].join(" ")}
        >
          {forgotten ? "Marqué à revoir" : "À revoir"}
        </button>
      </div>

      {show && (
        <p dir="rtl" className="mt-3 text-lg font-semibold text-[#0f766e]">
          {ar}
        </p>
      )}
    </li>
  );
}

/* ------------------------------ Recorder ------------------------------ */
function Recorder() {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const chunks = useRef([]);

  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        setUrl(URL.createObjectURL(new Blob(chunks.current, { type: rec.mimeType })));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setError("Impossible d'accéder au micro. Autorise le micro dans le navigateur.");
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="rounded-xl border border-[#c9c2b4] bg-white p-4">
      <p className="mb-3 font-semibold">Enregistre-toi puis réécoute</p>
      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            onClick={start}
            className="rounded-lg bg-[#c2410c] px-4 py-2 font-semibold text-white"
          >
            ● Enregistrer
          </button>
        ) : (
          <button
            onClick={stop}
            className="rounded-lg bg-[#1b2433] px-4 py-2 font-semibold text-white"
          >
            ■ Arrêter
          </button>
        )}
        {url && <audio controls src={url} className="max-w-full" />}
      </div>
      {error && <p className="mt-2 text-sm text-[#c2410c]">{error}</p>}
      <p className="mt-2 text-xs text-[#5b6577]">
        L'enregistrement reste dans le navigateur et disparaît quand tu fermes la page.
      </p>
    </div>
  );
}

/* ----------------------------- Forgotten ----------------------------- */
function Forgotten({ lessons, progress, toggleForgotten, back }) {
  const items = useMemo(() => {
    const out = [];
    for (const l of lessons) {
      for (const v of l.vocabulary) {
        if (progress.forgotten[`${l.day}|${v.french}`]) out.push({ day: l.day, ...v });
      }
      for (const p of l.phrases) {
        if (progress.forgotten[`${l.day}|${p.french}`]) out.push({ day: l.day, ...p });
      }
    }
    return out;
  }, [lessons, progress.forgotten]);

  return (
    <>
      <button onClick={back} className="mb-4 text-sm underline">
        ← Toutes les leçons
      </button>
      <h1 className="mb-2 font-serif text-3xl font-bold">Mots et phrases à revoir</h1>
      <p className="mb-6 text-sm text-[#5b6577]">
        Relis cette liste chaque soir. Retire un élément quand tu le connais bien.
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#c9c2b4] p-6">
          La liste est vide. Pendant les leçons, clique sur « À revoir » pour ajouter ce que tu
          oublies.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((it) => (
            <Card
              key={`${it.day}|${it.french}`}
              fr={it.french}
              ar={it.arabic}
              example={it.example}
              forgotten
              onForgot={() => toggleForgotten(it.day, it.french)}
            />
          ))}
        </ul>
      )}
    </>
  );
}