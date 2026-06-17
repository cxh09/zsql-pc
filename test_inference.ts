type IconName = 'home' | 'file' | 'settings'
interface PageMeta { key: string; icon: IconName; description?: string }
interface SearchPageItem { key: string; icon: string }

const PAGE_REGISTRY: PageMeta[] = [{ key: 'a', icon: 'home' }]
const AVAILABLE_PAGES: SearchPageItem[] = PAGE_REGISTRY.map((p) => ({ key: p.key, icon: p.icon }))

const x = AVAILABLE_PAGES.filter(p => true)
const y = x.map(p => ({ key: p.key, icon: p.icon }))
type T = typeof y[number]
const sample: T = { key: 'a', icon: 'home' }
function test(t: T) { return t }
test({ key: 'a', icon: 'home' })
