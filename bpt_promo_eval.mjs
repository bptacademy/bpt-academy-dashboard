const url = "https://nobxhhnhakawhbimrate.supabase.co/rest/v1/rpc/evaluate_all_promotion_cycles";
const key = "sb_secret_Ti470YHzM_Hxvxz8GTfSzw_SfQKW5qC";

const res = await fetch(url, {
  method: "POST",
  headers: {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({})
});

const text = await res.text();
console.log("Status:", res.status);
console.log("Body:", text);
