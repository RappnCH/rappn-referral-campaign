import pandas as pd
import json

def mappa_cantoni_plz(csv_filepath):
    # Leggiamo il CSV. Il separatore è ';'
    df = pd.read_csv(csv_filepath, sep=';', skipinitialspace=True)
    
    # Rimuoviamo eventuali spazi accidentali dai nomi delle colonne e dai valori
    df.columns = df.columns.str.strip()
    df['Kantonskürzel'] = df['Kantonskürzel'].astype(str).str.strip()
    df['Sprache'] = df['Sprache'].astype(str).str.strip().str.lower()
    
    # Funzione per determinare la chiave del cantone in base a sigla e lingua
    def ottieni_chiave_cantone(row):
        kanton = row['Kantonskürzel']
        lang = row['Sprache']
        
        # Mappatura per il Canton Grigioni (GR)
        if kanton == 'GR':
            if lang == 'rm':
                return 'GR_RO'
            elif lang == 'de':
                return 'GR_DE'
            elif lang == 'it':
                return 'GR_IT'
                
        # Mappatura per il Canton Vallese (VS)
        elif kanton == 'VS':
            if lang == 'fr':
                return 'VS_FR'
            elif lang == 'de':
                return 'VS_DE'
                
        # Mappatura per il Canton Friburgo (FR)
        elif kanton == 'FR':
            if lang == 'de':
                return 'FR_DE'
            elif lang == 'fr':   
                return 'FR_FR' 
                
        # Per tutti gli altri cantoni ritorna la sigla normale (es. VD, TI, ZH)
        return kanton

    # Creiamo la nuova colonna
    df['ChiaveCantone'] = df.apply(ottieni_chiave_cantone, axis=1)
    
    # Raggruppiamo e convertiamo in dizionario (usando int() per avere numeri puliti nel JSON invece di numpy types)
    mappatura = df.groupby('ChiaveCantone')['PLZ4'].unique().apply(lambda x: [int(plz) for plz in x]).to_dict()
    
    return mappatura

def salva_in_json(dati, nome_file_output):
    # Salvataggio del dizionario in formato JSON
    with open(nome_file_output, 'w', encoding='utf-8') as f:
        # indent=4 rende il file JSON formattato su più righe e leggibile
        # ensure_ascii=False permette di mantenere eventuali caratteri speciali
        json.dump(dati, f, indent=4, ensure_ascii=False)
    print(f"File salvato con successo in: {nome_file_output}")

# ==========================================
# Esecuzione dello script
# ==========================================
if __name__ == "__main__":
    file_csv = 'AMTOVZ_CSV_LV95.csv'      # Sostituisci con il tuo file di input
    file_json = 'mappatura_cantoni.json' # Nome del file di output
    
    try:
        # 1. Elabora i dati
        risultato = mappa_cantoni_plz(file_csv)
        
        # 2. Salva nel file JSON
        salva_in_json(risultato, file_json)
            
    except FileNotFoundError:
        print(f"Errore: Il file {file_csv} non è stato trovato. Verifica il percorso.")