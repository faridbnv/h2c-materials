// Thermal: heat deflection at 0.45 and 1.8 MPa and the glass transition drawn product by product on one °C scale (the
// drawer's comparison heading, D139), then Vicat, melting and the other thermal properties counted.

import { domainSection } from './mechanical.js';

export default {
  id: 'thermal',
  title: 'Thermal',
  records: '#measurements-thermal',
  render(c, env, place) {
    return domainSection(c, 'Thermal', place, { id: 'thermal', anchor: '#measurements-thermal', noun: 'thermal' });
  },
};
