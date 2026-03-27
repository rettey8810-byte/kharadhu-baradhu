// Check and fix shop names - list all bills with their shop names
// Usage: node scripts/check-shop-names.cjs <userId>

const admin = require('firebase-admin');

const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function checkShopNames() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node check-shop-names.cjs <userId>');
    process.exit(1);
  }

  console.log(`\n=== Checking Shop Names ===\n`);

  const billsSnap = await db.collection('users').doc(userId).collection('groceryBills').get();
  const bills = billsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Group by shop name
  const byShop = {};
  for (const bill of bills) {
    const shop = bill.shop_name || 'Unknown';
    if (!byShop[shop]) byShop[shop] = [];
    byShop[shop].push(bill);
  }

  console.log(`Found ${Object.keys(byShop).length} unique shop names:\n`);

  for (const [shop, shopBills] of Object.entries(byShop).sort()) {
    console.log(`\n${shop} (${shopBills.length} bills):`);
    for (const b of shopBills) {
      const itemsSnap = await db.collection('users').doc(userId).collection('groceryBillItems')
        .where('grocery_bill_id', '==', b.id).get();
      const itemCount = itemsSnap.size;
      const merged = b.is_merged ? ' [MERGED]' : '';
      console.log(`  - ${b.bill_date} - MVR ${b.total} - ${itemCount} items${merged} - ID: ${b.id}`);
    }
  }

  console.log(`\n=== Dharavandhoo vs Ufanveli Check ===\n`);
  
  // Check if user wants to rename Dharavandhoo to Ufanveli
  const dharavandhooBills = bills.filter(b => 
    b.shop_name && b.shop_name.toLowerCase().includes('dharavandhoo')
  );
  
  const ufanveliBills = bills.filter(b => 
    b.shop_name && b.shop_name.toLowerCase().includes('ufanveli')
  );

  console.log(`Dharavandhoo bills: ${dharavandhooBills.length}`);
  for (const b of dharavandhooBills) {
    console.log(`  - ${b.shop_name} | ${b.bill_date} | MVR ${b.total}`);
  }

  console.log(`\nUfanveli bills: ${ufanveliBills.length}`);
  for (const b of ufanveliBills) {
    console.log(`  - ${b.shop_name} | ${b.bill_date} | MVR ${b.total}`);
  }

  console.log(`\nIf Dharavandhoo should be Ufanveli, run:`);
  console.log(`node scripts/rename-shop.cjs ${userId} "Dharavandhoo Shop" "Ufanveli"`);
  console.log(`node scripts/rename-shop.cjs ${userId} "Dharavandhoo shop" "Ufanveli"`);

  process.exit(0);
}

checkShopNames().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
