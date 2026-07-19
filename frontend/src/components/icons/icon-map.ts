import { generalIcons } from './icon-map-general';
import { extendedIcons } from './icon-map-extended';

export type { Icon } from './icon-map-general';

export const Icons = { ...generalIcons, ...extendedIcons };
