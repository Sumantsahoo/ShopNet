import { apiFetch } from './api';
import { getAllStatesWithDistricts } from 'india-state-district';

const stateDistrictData = getAllStatesWithDistricts();

export const DISTRICTS_BY_STATE = Object.fromEntries(stateDistrictData.map(({ name, districts }) => [
  name,
  districts.flatMap((district) => {
    const normalizedDistrict = district.trim();
    return name === 'Andhra Pradesh' && normalizedDistrict === 'Sri SathyaYSR'
      ? ['Sri Sathya Sai', 'YSR']
      : [normalizedDistrict];
  })
]));

export const INDIAN_STATES_AND_UTS = stateDistrictData.map(({ name }) => name);

const STATE_ALIASES = {
  Orissa: 'Odisha',
  Pondicherry: 'Puducherry',
  'NCT of Delhi': 'Delhi'
};

export const lookupIndiaPin = async (postalCode) => {
  const response = await apiFetch(`/api/address/pincode/${postalCode}`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'PIN code lookup failed. Check the six digits and try again.');
  }
  const state = STATE_ALIASES[result.state] || result.state;
  if (!INDIAN_STATES_AND_UTS.includes(state)) {
    throw new Error(`PIN lookup returned an unsupported region: ${result.state}.`);
  }

  return {
    state,
    district: result.district,
    country: 'India'
  };
};