function blank(value) {
  return value === undefined || value === null || value === '';
}

function applyIfBlank(target, key, value) {
  if (blank(target[key]) && !blank(value)) {
    target[key] = value;
  }
}

function pickDateBySetup(defaultPostingDate) {
  if (defaultPostingDate === 'No Date') {
    return null;
  }

  return new Date().toISOString().slice(0, 10);
}

async function applyVendorToPurchaseHeader(db, payload) {
  const mapped = {
    ...payload,
  };

  const setupResult = await db.query(
    `SELECT *
     FROM purchase_payables_setup
     LIMIT 1`
  );

  const setup = setupResult.rows[0] ?? {};

  applyIfBlank(
    mapped,
    'location_code',
    setup.default_location_code
  );

  applyIfBlank(
    mapped,
    'payment_terms_code',
    setup.default_payment_terms_code
  );

  applyIfBlank(
    mapped,
    'payment_method_code',
    setup.default_payment_method_code
  );

  const setupDate =
    pickDateBySetup(setup.default_posting_date);

  applyIfBlank(mapped, 'posting_date', setupDate);
  applyIfBlank(mapped, 'document_date', setupDate);
  applyIfBlank(mapped, 'order_date', setupDate);

  if (!blank(mapped.vendor_no)) {
    const vendorResult = await db.query(
      `SELECT *
       FROM vendors
       WHERE vendor_no = $1
       LIMIT 1`,
      [mapped.vendor_no]
    );

    const vendor = vendorResult.rows[0];

    if (vendor) {
      applyIfBlank(mapped, 'vendor_name', vendor.name);
      applyIfBlank(mapped, 'address', vendor.address);
      applyIfBlank(mapped, 'address_2', vendor.address_2);
      applyIfBlank(mapped, 'city', vendor.city);
      applyIfBlank(mapped, 'post_code', vendor.post_code);
      applyIfBlank(mapped, 'country_region_code', vendor.country_region_code);
      applyIfBlank(mapped, 'phone_no', vendor.phone_no);
      applyIfBlank(mapped, 'mobile_phone_no', vendor.mobile_phone_no);
      applyIfBlank(mapped, 'email', vendor.email);
      applyIfBlank(mapped, 'contact', vendor.contact_person);
      applyIfBlank(mapped, 'purchaser_code', vendor.purchaser_code);
      applyIfBlank(mapped, 'location_code', vendor.location_code);
      applyIfBlank(mapped, 'payment_terms_code', vendor.payment_terms_code);
      applyIfBlank(mapped, 'payment_method_code', vendor.payment_method_code);
      applyIfBlank(mapped, 'shipment_method_code', vendor.shipment_method_code);
      applyIfBlank(mapped, 'vendor_gst_reg_no', vendor.gst_registration_no);
    }
  }

  return mapped;
}

async function applyCustomerToSalesHeader(db, payload) {
  const mapped = {
    ...payload,
  };

  const setupResult = await db.query(
    `SELECT *
     FROM sales_receivables_setup
     LIMIT 1`
  );

  const setup = setupResult.rows[0] ?? {};

  applyIfBlank(
    mapped,
    'location_code',
    setup.default_location_code
  );

  const setupDate =
    pickDateBySetup(setup.default_posting_date);

  applyIfBlank(mapped, 'posting_date', setupDate);
  applyIfBlank(mapped, 'document_date', setupDate);

  if (!blank(mapped.customer_no)) {
    const customerResult = await db.query(
      `SELECT *
       FROM customers
       WHERE customer_no = $1
       LIMIT 1`,
      [mapped.customer_no]
    );

    const customer = customerResult.rows[0];

    if (customer) {
      applyIfBlank(mapped, 'customer_name', customer.name);
      applyIfBlank(mapped, 'customer_gst_reg_no', customer.gst_registration_no);
      applyIfBlank(mapped, 'gst_customer_type', customer.gst_customer_type);
      applyIfBlank(mapped, 'address', customer.address);
      applyIfBlank(mapped, 'address_2', customer.address_2);
      applyIfBlank(mapped, 'city', customer.city);
      applyIfBlank(mapped, 'post_code', customer.post_code);
      applyIfBlank(mapped, 'country_region_code', customer.country_region_code);
      applyIfBlank(mapped, 'phone_no', customer.phone_no);
      applyIfBlank(mapped, 'email', customer.email);
      applyIfBlank(mapped, 'contact', customer.contact_person);
      applyIfBlank(mapped, 'location_code', customer.location_code);
      applyIfBlank(mapped, 'payment_terms_code', customer.payment_terms_code);
      applyIfBlank(mapped, 'payment_method_code', customer.payment_method_code);
      applyIfBlank(mapped, 'shipment_method_code', customer.shipment_method_code);
    }
  }

  return mapped;
}

async function applyItemToPurchaseLine(db, payload) {
  const mapped = {
    ...payload,
  };

  if (blank(mapped.item_no)) {
    return mapped;
  }

  const itemResult = await db.query(
    `SELECT *
     FROM items
     WHERE item_no = $1
     LIMIT 1`,
    [mapped.item_no]
  );

  const item = itemResult.rows[0];

  if (item) {
    applyIfBlank(mapped, 'item_description', item.description);
    applyIfBlank(mapped, 'unit_of_measure_code', item.purch_unit_of_measure || item.base_unit_of_measure);
    applyIfBlank(mapped, 'direct_unit_cost_excl_vat', item.unit_cost || item.standard_cost);
    applyIfBlank(mapped, 'location_code', item.location_code);
    applyIfBlank(mapped, 'gst_group_code', item.gst_group_code);
    applyIfBlank(mapped, 'hsn_sac_code', item.hsn_sac_code);
  }

  const setupResult = await db.query(
    `SELECT default_location_code, default_qty_to_receive
     FROM purchase_payables_setup
     LIMIT 1`
  );

  const setup = setupResult.rows[0] ?? {};

  applyIfBlank(mapped, 'location_code', setup.default_location_code);

  if (blank(mapped.qty_to_receive)) {
    mapped.qty_to_receive =
      setup.default_qty_to_receive === 'Blank'
        ? 0
        : Number(mapped.quantity ?? 0);
  }

  if (blank(mapped.line_amount)) {
    mapped.line_amount =
      Number(mapped.quantity ?? 0) *
      Number(mapped.direct_unit_cost_excl_vat ?? 0);
  }

  return mapped;
}

async function applyItemToSalesLine(db, payload) {
  const mapped = {
    ...payload,
  };

  if (blank(mapped.item_no)) {
    return mapped;
  }

  const itemResult = await db.query(
    `SELECT *
     FROM items
     WHERE item_no = $1
     LIMIT 1`,
    [mapped.item_no]
  );

  const item = itemResult.rows[0];

  if (item) {
    applyIfBlank(mapped, 'item_description', item.description);
    applyIfBlank(mapped, 'unit_of_measure_code', item.sales_unit_of_measure || item.base_unit_of_measure);
    applyIfBlank(mapped, 'unit_price', item.unit_price);
    applyIfBlank(mapped, 'location_code', item.location_code);
    applyIfBlank(mapped, 'hsn_sac_code', item.hsn_sac_code);
    applyIfBlank(mapped, 'gst_group_code', item.gst_group_code);
  }

  const setupResult = await db.query(
    `SELECT default_location_code
     FROM sales_receivables_setup
     LIMIT 1`
  );

  const setup = setupResult.rows[0] ?? {};

  applyIfBlank(mapped, 'location_code', setup.default_location_code);

  if (blank(mapped.line_amount)) {
    mapped.line_amount =
      Number(mapped.quantity ?? 0) *
      Number(mapped.unit_price ?? 0);
  }

  return mapped;
}

module.exports = {
  applyCustomerToSalesHeader,
  applyItemToPurchaseLine,
  applyItemToSalesLine,
  applyVendorToPurchaseHeader,
};
