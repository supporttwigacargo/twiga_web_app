import twigaStarLogo from '../imports/twiga-star-logo.png'

export function companyLogoUrl(logoPath?: string): string {
  return logoPath?.trim() || twigaStarLogo
}
