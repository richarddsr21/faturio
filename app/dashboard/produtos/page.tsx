import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProductList } from "@/components/produtos/product-list";

export default async function ProdutosPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, cost, current_price, stock_quantity, minimum_stock")
    .eq("status", "active")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Produtos</h1>
          <p className="text-muted-foreground">Cadastre e gerencie os produtos que você vende.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/produtos/novo">Novo produto</Link>
        </Button>
      </div>

      {products && products.length > 0 ? (
        <ProductList products={products} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda —{" "}
          <Link href="/dashboard/produtos/novo" className="font-medium text-primary hover:underline">
            adicionar produto
          </Link>
          .
        </p>
      )}
    </div>
  );
}
