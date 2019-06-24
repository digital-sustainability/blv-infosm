export interface FilterConfig {
    canton: {
        filter: string[],
        hierarchy: number,
        position?: number
    },
    munic: {
        filter: string[],
        hierarchy: number
    },
    epidemic_group: {
        filter: string[],
        hierarchy: number,
        position?: number
    },
    epidemic: {
        filter: string[],
        hierarchy: number,
    },
    animal_group: {
        filter: string[],
        hierarchy: number,
        position?: number
    },
    animal_species: {
        filter: string[],
        hierarchy: number
    },
}
