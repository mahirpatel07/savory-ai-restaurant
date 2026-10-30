import RestaurantSetting from '../models/RestaurantSetting.js';

const DEFAULT_HOURS = [
  { day: 'Monday', openTime: '11:00', closeTime: '00:00', isClosed: false },
  { day: 'Tuesday', openTime: '11:00', closeTime: '00:00', isClosed: false },
  { day: 'Wednesday', openTime: '11:00', closeTime: '00:00', isClosed: false },
  { day: 'Thursday', openTime: '11:00', closeTime: '00:00', isClosed: false },
  { day: 'Friday', openTime: '11:00', closeTime: '00:00', isClosed: false },
  { day: 'Saturday', openTime: '11:00', closeTime: '00:00', isClosed: false },
  { day: 'Sunday', openTime: '11:00', closeTime: '00:00', isClosed: false }
];

const DEFAULT_BRANCHES = [
  { branchId: 'BR-01', name: 'Main Flagship Branch', address: '123 Gourmet Ave, Downtown', phone: '+1 555-0199', active: true },
];

const DEFAULT_PRINTERS = [
  { name: 'POS Main Receipt Printer', type: 'receipt', connectionType: 'network', ipAddress: '192.168.1.101', port: 9100, active: true },
  { name: 'Kitchen Hot Line Printer', type: 'kitchen', connectionType: 'network', ipAddress: '192.168.1.102', port: 9100, active: true }
];

/**
 * Get or initialize global restaurant settings
 */
export const getSettings = async () => {
  let settings = await RestaurantSetting.findOne();
  if (!settings) {
    settings = await RestaurantSetting.create({
      restaurantName: 'Savory Michelin Restaurant',
      tagline: 'Exquisite Culinary Excellence',
      taxRate: 5.0,
      taxName: 'GST',
      branches: DEFAULT_BRANCHES,
      printers: DEFAULT_PRINTERS,
      businessHours: DEFAULT_HOURS
    });
  } else {
    // Update existing records to 11:00 am - 12:00 am (00:00) across all week days if they have old values
    let updated = false;
    if (settings.businessHours && settings.businessHours.length > 0) {
      settings.businessHours.forEach(h => {
        if (h.openTime === '08:00' || h.openTime === '09:00') {
          h.openTime = '11:00';
          updated = true;
        }
        if (h.closeTime === '23:00' || h.closeTime === '22:00') {
          h.closeTime = '00:00';
          updated = true;
        }
      });
      if (updated) {
        await settings.save();
      }
    } else {
      settings.businessHours = DEFAULT_HOURS;
      await settings.save();
    }
  }
  return settings;
};

/**
 * Update restaurant settings
 */
export const updateSettings = async (updateData) => {
  let settings = await RestaurantSetting.findOne();
  if (!settings) {
    settings = new RestaurantSetting(updateData);
  } else {
    Object.assign(settings, updateData);
  }
  await settings.save();
  return settings;
};

/**
 * Add or update branch
 */
export const saveBranch = async (branchData) => {
  const settings = await getSettings();
  if (branchData._id || branchData.branchId) {
    const idx = settings.branches.findIndex(b => b._id?.toString() === branchData._id || b.branchId === branchData.branchId);
    if (idx >= 0) {
      settings.branches[idx] = { ...settings.branches[idx].toObject(), ...branchData };
    } else {
      settings.branches.push(branchData);
    }
  } else {
    branchData.branchId = `BR-${String(settings.branches.length + 1).padStart(2, '0')}`;
    settings.branches.push(branchData);
  }
  await settings.save();
  return settings;
};

/**
 * Add or update printer
 */
export const savePrinter = async (printerData) => {
  const settings = await getSettings();
  if (printerData._id) {
    const idx = settings.printers.findIndex(p => p._id?.toString() === printerData._id);
    if (idx >= 0) {
      settings.printers[idx] = { ...settings.printers[idx].toObject(), ...printerData };
    } else {
      settings.printers.push(printerData);
    }
  } else {
    settings.printers.push(printerData);
  }
  await settings.save();
  return settings;
};

/**
 * Delete a printer
 */
export const deletePrinter = async (printerId) => {
  const settings = await getSettings();
  settings.printers = settings.printers.filter(p => p._id?.toString() !== printerId);
  await settings.save();
  return settings;
};

/**
 * Test print trigger simulation
 */
export const testPrint = async (printerId) => {
  const settings = await getSettings();
  const printer = settings.printers.id(printerId) || settings.printers[0];
  return {
    success: true,
    message: `Test print successfully sent to ${printer?.name || 'Printer'} (${printer?.ipAddress || 'Network Port'})`,
    printer
  };
};
