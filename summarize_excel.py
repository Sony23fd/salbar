import json

with open('excel_analysis.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('summary_urtug.txt', 'w', encoding='utf-8') as out:
    out.write("SUMMARY OF EXCEL SHEETS AND STRUCTURE:\n")
    for s in data:
        out.write(f"\n=======================================================\n")
        out.write(f"SHEET NAME: {s['sheet']} ({s['max_row']} rows x {s['max_col']} cols)\n")
        out.write(f"=======================================================\n")
        
        for r in s['rows']:
            row_num = r['row']
            cells_str = []
            formulas_str = []
            for c in r['cells']:
                col_idx = c['col']
                val = c['val']
                form = c['formula']
                if val:
                    cells_str.append(f"C{col_idx}:{val}")
                if form:
                    formulas_str.append(f"C{col_idx}:{form}")
            
            line = f"Row {row_num:2d} | " + " | ".join(cells_str)
            if formulas_str:
                line += "  [[ FORMULAS: " + ", ".join(formulas_str) + " ]]"
            out.write(line + "\n")

print("Wrote summary to summary_urtug.txt")
