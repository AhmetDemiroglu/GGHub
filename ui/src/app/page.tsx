import { Button } from "../components/ui/button";

export default function HomePage() {
  return (
    <main className="flex items-center justify-center h-screen">
      <div>
        <h1 className="text-2xl mb-4">Ana Sayfa</h1>
        <Button variant="outline">Merhaba ShadCN</Button>
      </div>
    </main>
  );
}