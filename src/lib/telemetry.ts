/**
 * WIKIOBS Privacy-First Offline Telemetry Shim.
 * Guarantees 100% offline operation, zero data collection, and zero network transmission.
 */

const noop = () => {}

export const telemetry = {
  init: noop,
  capture: noop,
  identify: noop,
  reset: noop,
  get_distinct_id: () => 'offline-local-user',
  has_opted_out_capturing: () => true,
  opt_out_capturing: noop,
  opt_in_capturing: noop,
  register: noop,
  unregister: noop,
}

export default telemetry
