import { useState, useRef, useEffect } from 'react'
import { Search, Star, Loader2 } from 'lucide-react'
import useStore from '../../store/useStore'
import { cn } from '../../lib/cn'

export default function SearchBar({ onAnalyze }) {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const { searchResults, searchLoading, searchStock, favorites, toggleFavorite } = useStore()
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (value) => {
    setQuery(value)
    clearTimeout(debounceRef.current)
    if (value.trim().length >= 1) {
      debounceRef.current = setTimeout(() => {
        searchStock(value.trim())
        setShowDropdown(true)
      }, 300)
    } else {
      setShowDropdown(false)
    }
  }

  const handleSelect = (code, name) => {
    setQuery(`${name} (${code})`)
    setShowDropdown(false)
    onAnalyze(code, name)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const code = query.match(/\((\d{6})\)/)?.[1] || query.trim()
    if (code) onAnalyze(code, query.replace(/\s*\(\d{6}\)/, '').trim())
  }

  const isFav = (code) => favorites.some(f => f.code === code)

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            placeholder="종목 코드 또는 종목명 검색 (예: 삼성전자, 005930)"
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchLoading && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
          )}
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          분석
        </button>
      </form>

      {/* 검색 드롭다운 */}
      {showDropdown && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {searchResults.map(item => (
            <div
              key={item.code}
              className="flex items-center justify-between px-3 py-2 hover:bg-secondary cursor-pointer"
              onClick={() => handleSelect(item.code, item.name)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-card-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.code}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(item.code, item.name)
                }}
                className="p-1 hover:bg-accent rounded"
              >
                <Star
                  size={14}
                  className={cn(
                    isFav(item.code) ? 'text-warning fill-warning' : 'text-muted-foreground'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
