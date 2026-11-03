import { ConnectionStatus } from "@/components/ConnectionStatus";

export default function Home() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Farmy Mini</h1>
        <p className="opacity-70">
          Track agricultural batches (farmer → transporter → warehouse → retailer) and sell them through an
          escrow that caps the markup.
        </p>
      </section>
      <ConnectionStatus />
    </div>
  );
}
