import { Cpu, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <div className="bg-white max-w-[278px] w-full mx-auto rounded p-2 mb-8 border shadow-md">
      <ul>
        {Array.from({ length: 8 }).map((_, i: number) => (
          <li key={i} className="py-1">
            <a
              href="#"
              className="bg-white h-[42px] w-full flex items-center justify-start hover:bg-slate-200 px-2 relative gap-2"
            >
              <span>
                <Cpu />
              </span>
              <span>Electronics</span>
              <span className="end-2 absolute">
                <ArrowRight className="w-4 h-4 ml-2" />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <ul className="border-t border-slate-200 my-5">
        <li className="py-2">
          <a
            href="#"
            className="bg-white h-[42px] w-full flex items-center justify-start hover:bg-slate-200 px-2 relative gap-2"
          >
            <span>
              <Cpu />
            </span>
            <span>Electronics</span>
            <span className="end-2 absolute">
              <ArrowRight className="w-4 h-4 ml-2" />
            </span>
          </a>
        </li>
      </ul>
    </div>
  );
}
