const fs = require('fs');

let content = fs.readFileSync('src/components/OrderManager.tsx', 'utf8');

// 1. Branch selection label to show margin
content = content.replace(
  `{branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — ({b.location})
                    </option>
                  ))}`,
  `{branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — ({b.location}) {b.marginPercent ? \`[\${b.marginPercent > 0 ? '+' : ''}\${b.marginPercent}%]\` : ''}
                    </option>
                  ))}`
);

// 2. Add margin logic to items mapping
const oldItemMap = `                  {orderItems.map((item, idx) => {
                    const selectedProd = products.find((p) => p.id === item.productId);
                    const rowTotal = selectedProd ? selectedProd.unitPrice * item.quantity : 0;`;

const newItemMap = `                  {orderItems.map((item, idx) => {
                    const selectedBranch = branches.find(b => b.id === selectedBranchId);
                    const marginPercent = selectedBranch?.marginPercent || 0;
                    const selectedProd = products.find((p) => p.id === item.productId);
                    const basePrice = selectedProd ? selectedProd.unitPrice : 0;
                    const effectivePrice = basePrice * (1 + marginPercent / 100);
                    const rowTotal = effectivePrice * item.quantity;`;

content = content.replace(oldItemMap, newItemMap);

// 3. Update the product selection dropdown to show effective price
const oldProdMap = `                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) — {p.unitPrice.toLocaleString()}₮ [Үлдэгдэл: {p.stockQuantity}]
                              </option>
                            ))}`;

const newProdMap = `                            {products.map((p) => {
                              const effPrice = p.unitPrice * (1 + (branches.find(b => b.id === selectedBranchId)?.marginPercent || 0) / 100);
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku}) — {effPrice.toLocaleString()}₮ {(branches.find(b => b.id === selectedBranchId)?.marginPercent || 0) !== 0 ? \`(Үндсэн: \${p.unitPrice.toLocaleString()}₮)\` : ''} [Үлдэгдэл: {p.stockQuantity}]
                                </option>
                              );
                            })}`;

content = content.replace(oldProdMap, newProdMap);

// 4. Update the total at the bottom
const oldTotal = `                <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
                  <div className="text-sm font-bold text-slate-700">Нийт дүн:</div>
                  <div className="text-xl font-black text-blue-600 font-mono">
                    {orderItems
                      .reduce((sum, item) => {
                        const selectedProd = products.find((p) => p.id === item.productId);
                        return sum + (selectedProd ? selectedProd.unitPrice * item.quantity : 0);
                      }, 0)
                      .toLocaleString()}
                    ₮
                  </div>
                </div>`;

const newTotal = `                <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                  <div className="text-sm font-bold text-slate-700 flex flex-col">
                    <span>Нийт дүн:</span>
                    {branches.find(b => b.id === selectedBranchId)?.marginPercent ? (
                      <span className="text-[10px] text-emerald-600 font-medium mt-0.5">
                        Салбарын нэмэгдэл ({branches.find(b => b.id === selectedBranchId)?.marginPercent > 0 ? '+' : ''}{branches.find(b => b.id === selectedBranchId)?.marginPercent}%) шингэсэн дүн
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xl font-black text-blue-600 font-mono">
                    {orderItems
                      .reduce((sum, item) => {
                        const selectedProd = products.find((p) => p.id === item.productId);
                        const marginPercent = branches.find(b => b.id === selectedBranchId)?.marginPercent || 0;
                        const effectivePrice = selectedProd ? selectedProd.unitPrice * (1 + marginPercent / 100) : 0;
                        return sum + (effectivePrice * item.quantity);
                      }, 0)
                      .toLocaleString()}
                    ₮
                  </div>
                </div>`;

content = content.replace(oldTotal, newTotal);

fs.writeFileSync('src/components/OrderManager.tsx', content, 'utf8');
