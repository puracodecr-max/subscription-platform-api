import * as catalogsRepository from './catalogs.repository';

export function listCurrencies() {
  return catalogsRepository.listCurrencies();
}

export function listPaymentMethods() {
  return catalogsRepository.listPaymentMethods();
}
