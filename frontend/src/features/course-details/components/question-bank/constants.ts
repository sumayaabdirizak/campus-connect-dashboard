/// Select sentinels — shadcn Select can't take `""` as a value. Map back to
/// `undefined` (filters) or `null` (form fields) when serialising.
export const ANY_VALUE = '__any__';
export const NO_MODULE = '__none__';
