import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#111827] py-12 px-2">
      <div className="max-w-4xl w-full mx-auto bg-[#1f2937] rounded-2xl shadow-2xl p-10 flex flex-col items-center border border-gray-700">
        <h1 className="text-4xl font-extrabold mb-10 text-center text-gray-100 tracking-tight drop-shadow-lg">
          Lazy Lions Leaderboards
        </h1>
        <div className="flex justify-center mb-12 space-x-4 text-center">
          {/* ...tabs... */}
        </div>
        <div className="flex flex-col items-center w-full">
          {/* ...table and pagination... */}
        </div>
      </div>
      <footer className={styles.footer}>
        <a
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
