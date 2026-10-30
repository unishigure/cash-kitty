import "./style.css";
import { ReceiptImport } from "./ReceiptImport";

export function App() {
  return (
    <div className="mx-auto my-10 flex max-w-240 flex-col gap-4 px-4 font-sans leading-[1.6]">
      <ReceiptImport />
    </div>
  );
}

export default App;
