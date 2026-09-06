import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Oqyrman-ды телефонға орнату",
  description:
    "Oqyrman-ды iPhone мен Android телефонының басты экранына қосу және еске салу хабарландыруын қосу нұсқаулығы.",
};

/** Қадам нөмірі — бүкіл бет бойындағы бірыңғай белгі */
function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[auto_1fr] items-start gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-base font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 space-y-2">
        <p className="text-lg font-bold leading-snug text-gray-900">{title}</p>
        {children}
      </div>
    </li>
  );
}

/** Телефон мәзіріндегі жазудың үш тілдегі нұсқасы */
function Langs({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span
          key={t}
          className="rounded-lg bg-blue-50 px-2.5 py-1 text-[13px] font-semibold text-blue-700"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-7 rounded-r-xl border-l-4 border-amber-500 bg-amber-50 px-5 py-3.5 text-gray-800">
      {children}
    </div>
  );
}

export default function OrnatuPage() {
  return (
    <main className="bg-gray-50 pb-16">
      {/* Кіріспе */}
      <header className="border-b border-gray-100 bg-white px-5 py-11 text-center">
        <div className="mx-auto max-w-2xl">
          <Image
            src="/icon-192.png"
            alt="Oqyrman"
            width={80}
            height={80}
            className="mx-auto h-20 w-20 rounded-[20px] shadow-md"
          />
          <h1 className="mt-5 text-3xl font-extrabold leading-tight text-primary-900 sm:text-4xl">
            Oqyrman-ды телефонның басты экранына қосу
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-lg text-gray-600">
            Екі минут алады. Ешнәрсе жүктеудің қажеті жоқ.
          </p>

          <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
            {[
              "Кәдімгі қолданба сияқты ашылады",
              "Еске салу хабарландыруы келеді",
              "Браузердің жолақтары көрінбейді",
            ].map((t) => (
              <div
                key={t}
                className="rounded-2xl bg-primary-50 px-4 py-3.5 text-sm font-semibold text-primary-800"
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* iPhone */}
      <section className="border-b border-gray-100 bg-gray-50 px-5 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center gap-3.5">
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-gray-900">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M16.6 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6 0 0-2.5-1-2.5-3.5zM14.3 5.9c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z" />
              </svg>
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900">iPhone</h2>
          </div>
          <p className="mb-7 text-gray-500">
            Міндетті түрде <b className="text-gray-800">Safari</b> браузерінен жасаңыз. Chrome
            немесе Yandex браузерінен қоссаңыз, хабарландыру келмейді.
          </p>

          <ol className="space-y-6">
            <Step n={1} title="Safari-ді ашыңыз">
              <p className="text-gray-600">
                Мекенжай жолағына <b className="text-gray-900">oqyrman.kz</b> деп теріңіз де,
                сайтқа кіріңіз.
              </p>
            </Step>

            <Step n={2} title="Төменгі «Бөлісу» белгісін басыңыз">
              <p className="text-gray-600">
                Экранның төменгі ортасындағы, жоғары қараған көрсеткісі бар шаршы:
              </p>
              <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-800">
                <svg
                  width="16"
                  height="19"
                  viewBox="0 0 24 28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 17V3" />
                  <path d="M7 8l5-5 5 5" />
                  <path d="M5 12H3v13h18V12h-2" />
                </svg>
                Бөлісу
              </span>
              <p className="text-gray-600">
                Белгі көрінбесе — экранды сәл жоғары сырғытыңыз, төменгі жолақ шығады.
              </p>
            </Step>

            <Step n={3} title="Тізімді төмен сырғытып, «Басты экранға қосу» дегенді табыңыз">
              <p className="text-gray-600">Телефоныңыздың тіліне қарай былай аталады:</p>
              <Langs items={["Үй экранына қосу", "На экран «Домой»", "Add to Home Screen"]} />
            </Step>

            <Step n={4} title="Жоғарғы оң жақтағы «Қосу» батырмасын басыңыз">
              <p className="text-gray-600">
                «Добавить» немесе «Add». Белгіше басты экраныңызда пайда болады.
              </p>
            </Step>

            <Step n={5} title="Енді сол белгішеден ашыңыз">
              <p className="text-gray-600">
                Бұдан былай қолданбаны Safari-ден емес,{" "}
                <b className="text-gray-900">басты экрандағы белгішеден</b> ашыңыз. Хабарландыру
                тек сол кезде жұмыс істейді.
              </p>
            </Step>
          </ol>

          <Note>
            <b className="text-amber-700">Ескерту:</b> iPhone-да хабарландыру iOS 16.4 нұсқасынан
            бастап жұмыс істейді. Телефоныңыз ескілеу болса, қолданба бәрібір ашылады — тек еске
            салу келмейді.
          </Note>
        </div>
      </section>

      {/* Android */}
      <section className="border-b border-gray-100 bg-white px-5 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center gap-3.5">
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-primary-600">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M6 9.5h12v8.2c0 .6-.5 1.1-1.1 1.1h-1v2.6c0 .9-.7 1.6-1.6 1.6s-1.6-.7-1.6-1.6v-2.6h-1.4v2.6c0 .9-.7 1.6-1.6 1.6s-1.6-.7-1.6-1.6v-2.6h-1c-.6 0-1.1-.5-1.1-1.1V9.5zM3.6 9.4c.9 0 1.6.7 1.6 1.6v4.6c0 .9-.7 1.6-1.6 1.6S2 16.5 2 15.6V11c0-.9.7-1.6 1.6-1.6zm16.8 0c.9 0 1.6.7 1.6 1.6v4.6c0 .9-.7 1.6-1.6 1.6s-1.6-.7-1.6-1.6V11c0-.9.7-1.6 1.6-1.6zM15.6 3.4l1.1-1.9a.3.3 0 10-.5-.3l-1.1 2c-.9-.4-1.9-.6-3-.6s-2.1.2-3 .6l-1.1-2a.3.3 0 10-.5.3l1.1 1.9C6.5 4.5 5.2 6.3 5 8.4h14c-.2-2.1-1.5-3.9-3.4-5zM9.2 6.4a.6.6 0 110-1.2.6.6 0 010 1.2zm5.6 0a.6.6 0 110-1.2.6.6 0 010 1.2z" />
              </svg>
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900">Android</h2>
          </div>
          <p className="mb-7 text-gray-500">
            Chrome браузерінен жасаған ыңғайлы. Samsung Internet-те де болады — төменде жазылған.
          </p>

          <ol className="space-y-6">
            <Step n={1} title="Chrome-ды ашыңыз">
              <p className="text-gray-600">
                Мекенжай жолағына <b className="text-gray-900">oqyrman.kz</b> деп теріңіз де,
                сайтқа кіріңіз.
              </p>
            </Step>

            <Step n={2} title="Төменде ұсыныс шықса — бірден басыңыз">
              <p className="text-gray-600">
                Chrome жиі өзі ұсынады: «Oqyrman қолданбасын орнату» деген жолақ шығады. Соны
                бассаңыз, келесі қадам қажет емес.
              </p>
            </Step>

            <Step n={3} title="Шықпаса — жоғарғы оң жақтағы үш нүктені басыңыз">
              <span className="inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 font-semibold text-gray-800">
                <svg width="6" height="19" viewBox="0 0 6 20" fill="currentColor" aria-hidden="true">
                  <circle cx="3" cy="3" r="2" />
                  <circle cx="3" cy="10" r="2" />
                  <circle cx="3" cy="17" r="2" />
                </svg>
                Мәзір
              </span>
              <p className="text-gray-600">Ашылған тізімнен мынаны таңдаңыз:</p>
              <Langs
                items={[
                  "Қолданбаны орнату",
                  "Установить приложение",
                  "Install app",
                  "Басты экранға қосу",
                ]}
              />
            </Step>

            <Step n={4} title="«Орнату» дегенді басыңыз">
              <p className="text-gray-600">
                «Установить» немесе «Install». Белгіше басты экраныңызға қосылады.
              </p>
            </Step>

            <Step n={5} title="Белгішеден ашыңыз">
              <p className="text-gray-600">
                Қолданба браузердің жолақтарынсыз, толық экранмен ашылады.
              </p>
            </Step>
          </ol>

          <Note>
            <b className="text-amber-700">Samsung Internet браузерінде:</b> төменгі мәзірден{" "}
            <b>≡</b> белгісін басып, «Бетті қосу» → «Басты экран» дегенді таңдаңыз.
          </Note>
        </div>
      </section>

      {/* Хабарландыруды қосу */}
      <section className="bg-gray-50 px-5 py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-extrabold text-gray-900">
            Соңғы қадам: еске салуды қосу
          </h2>
          <p className="mb-7 mt-1.5 text-gray-500">
            Екі телефонда да бірдей. Белгішеден ашқаннан кейін жасалады.
          </p>

          <ol className="space-y-6">
            <Step n={1} title="Төменгі мәзірдің ортасындағы «Оқу» батырмасын басыңыз" />
            <Step n={2} title="Күніне неше минут оқитыныңызды таңдаңыз">
              <p className="text-gray-600">15 немесе 20 минуттан бастаған дұрыс.</p>
            </Step>
            <Step n={3} title="Еске салу уақытын таңдаңыз">
              <p className="text-gray-600">
                Мысалы 19:00. Сол уақытта телефоныңызға хабарландыру келеді.
              </p>
            </Step>
            <Step n={4} title="«Жаңарту» батырмасын басыңыз">
              <p className="text-gray-600">
                Батырманы баспасаңыз сақталмайды. Сосын телефон «хабарландыруға рұқсат бересіз
                бе?» деп сұрайды — <b className="text-gray-900">«Рұқсат»</b> дегенді басыңыз.
              </p>
            </Step>
          </ol>

          {/* Ақаулықтар */}
          <div className="mt-9 space-y-3">
            {[
              [
                "«Басты экранға қосу» деген жол табылмай тұр",
                "iPhone-да Chrome немесе Yandex браузерін пайдаланып отырған шығарсыз. Safari-ден ашып көріңіз. Android-та браузер ескі болса, Chrome-ды жаңартыңыз.",
              ],
              [
                "Белгіше қосылды, бірақ хабарландыру келмейді",
                "Қолданбаны Safari-ден емес, басты экрандағы белгішеден ашыңыз. Сосын «Оқу» бетіне кіріп, уақытты қайта сақтап, рұқсат сұрағанда «Рұқсат» деңіз.",
              ],
              [
                "Бұрын «Рұқсат жоқ» деп басып қойғанмын",
                "iPhone: Параметрлер → Хабарландырулар → Oqyrman → қосыңыз. Android: Параметрлер → Қолданбалар → Oqyrman → Хабарландырулар.",
              ],
              [
                "Ескі белгіше тұр, суреті ауыспады",
                "Ескі белгішені басып тұрып өшіріңіз де, нұсқаулықты қайтадан орындаңыз. Телефон белгішені өзі жаңартпайды.",
              ],
            ].map(([q, a]) => (
              <div key={q} className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="font-bold text-gray-900">{q}</p>
                <p className="mt-1 text-gray-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Соңы */}
      <section className="bg-primary-600 px-5 py-14 text-center text-white">
        <h2 className="text-3xl font-extrabold text-white">Дайын</h2>
        <p className="mt-3 text-primary-100">
          Енді Oqyrman кәдімгі қолданба сияқты ашылады.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-white px-8 py-3 text-lg font-extrabold text-primary-700 transition hover:bg-primary-50"
        >
          oqyrman.kz
        </Link>
      </section>
    </main>
  );
}
