import {
  formatGermanDate,
  formatGermanDateTime,
  formatGermanNumber,
  formatGermanCurrency,
  formatGermanPercentage,
  formatGermanDecimal,
  formatGermanArea,
  formatGermanPricePerSqm,
  formatGermanMonth,
  formatGermanRelativeDate,
  formatGermanFileSize,
  formatGermanDuration,
  formatGermanAddress,
  formatGermanPhoneNumber,
  pluralize,
  getLocalizedText,
  DATA_TABLE_TEXTS,
} from '../data-table-localization'

describe('German Localization Utilities', () => {
  describe('formatGermanDate', () => {
    it('formats dates correctly in German format', () => {
      const date = new Date('2024-03-15')
      expect(formatGermanDate(date)).toBe('15.03.2024')
    })

    it('handles string dates', () => {
      expect(formatGermanDate('2024-12-25')).toBe('25.12.2024')
    })

    it('handles invalid dates', () => {
      expect(formatGermanDate('invalid')).toBe('-')
    })
  })

  describe('formatGermanDateTime', () => {
    it('formats date and time correctly', () => {
      const date = new Date('2024-03-15T14:30:00')
      expect(formatGermanDateTime(date)).toBe('15.03.2024, 14:30')
    })

    it('handles invalid dates', () => {
      expect(formatGermanDateTime('invalid')).toBe('-')
    })
  })

  describe('formatGermanNumber', () => {
    it('formats numbers with German locale', () => {
      expect(formatGermanNumber(1234.56)).toBe('1.234,56')
    })

    it('handles string numbers', () => {
      expect(formatGermanNumber('1234.56')).toBe('1.234,56')
    })

    it('handles invalid numbers', () => {
      expect(formatGermanNumber('invalid')).toBe('-')
    })
  })

  describe('formatGermanCurrency', () => {
    it('formats currency in EUR', () => {
      expect(formatGermanCurrency(1234.56)).toBe('1.234,56 €')
    })

    it('handles string values', () => {
      expect(formatGermanCurrency('1234.56')).toBe('1.234,56 €')
    })

    it('handles invalid values', () => {
      expect(formatGermanCurrency('invalid')).toBe('-')
    })
  })

  describe('formatGermanPercentage', () => {
    it('formats percentages correctly', () => {
      expect(formatGermanPercentage(25)).toBe('25,0 %')
    })

    it('handles decimal percentages', () => {
      expect(formatGermanPercentage(12.5)).toBe('12,5 %')
    })

    it('handles invalid values', () => {
      expect(formatGermanPercentage('invalid')).toBe('-')
    })
  })

  describe('formatGermanDecimal', () => {
    it('formats decimals with specified precision', () => {
      expect(formatGermanDecimal(123.456, 2)).toBe('123,46')
    })

    it('uses default precision of 2', () => {
      expect(formatGermanDecimal(123.456)).toBe('123,46')
    })

    it('handles invalid values', () => {
      expect(formatGermanDecimal('invalid')).toBe('-')
    })
  })

  describe('formatGermanArea', () => {
    it('formats area with m² suffix', () => {
      expect(formatGermanArea(123.45)).toBe('123 m²')
    })

    it('handles string values', () => {
      expect(formatGermanArea('123.45')).toBe('123 m²')
    })

    it('handles invalid values', () => {
      expect(formatGermanArea('invalid')).toBe('-')
    })
  })

  describe('formatGermanPricePerSqm', () => {
    it('formats price per square meter', () => {
      expect(formatGermanPricePerSqm(12.34)).toBe('12,34 €/m²')
    })

    it('handles string values', () => {
      expect(formatGermanPricePerSqm('12.34')).toBe('12,34 €/m²')
    })

    it('handles invalid values', () => {
      expect(formatGermanPricePerSqm('invalid')).toBe('-')
    })
  })

  describe('formatGermanMonth', () => {
    it('formats month and year in German', () => {
      const date = new Date('2024-03-15')
      expect(formatGermanMonth(date)).toBe('März 2024')
    })

    it('handles invalid dates', () => {
      expect(formatGermanMonth('invalid')).toBe('-')
    })
  })

  describe('formatGermanRelativeDate', () => {
    it('returns "Heute" for today', () => {
      const today = new Date()
      expect(formatGermanRelativeDate(today)).toBe('Heute')
    })

    it('returns "Gestern" for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(formatGermanRelativeDate(yesterday)).toBe('Gestern')
    })

    it('returns "Morgen" for tomorrow', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(formatGermanRelativeDate(tomorrow)).toBe('Morgen')
    })

    it('returns relative days for recent dates', () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      expect(formatGermanRelativeDate(threeDaysAgo)).toBe('vor 3 Tagen')
    })
  })

  describe('formatGermanFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatGermanFileSize(0)).toBe('0 Bytes')
      expect(formatGermanFileSize(1024)).toBe('1,0 KB')
      expect(formatGermanFileSize(1024 * 1024)).toBe('1,0 MB')
    })
  })

  describe('formatGermanDuration', () => {
    it('formats seconds', () => {
      expect(formatGermanDuration(30)).toBe('30 Sekunden')
      expect(formatGermanDuration(1)).toBe('1 Sekunde')
    })

    it('formats minutes', () => {
      expect(formatGermanDuration(120)).toBe('2 Minuten')
      expect(formatGermanDuration(60)).toBe('1 Minute')
    })

    it('formats hours', () => {
      expect(formatGermanDuration(3600)).toBe('1 Stunde')
      expect(formatGermanDuration(7200)).toBe('2 Stunden')
    })

    it('formats days', () => {
      expect(formatGermanDuration(86400)).toBe('1 Tag')
      expect(formatGermanDuration(172800)).toBe('2 Tage')
    })
  })

  describe('formatGermanAddress', () => {
    it('formats complete address', () => {
      expect(formatGermanAddress('Musterstraße 123', 'Berlin', '10115'))
        .toBe('Musterstraße 123, 10115 Berlin')
    })

    it('handles missing postal code', () => {
      expect(formatGermanAddress('Musterstraße 123', 'Berlin'))
        .toBe('Musterstraße 123, Berlin')
    })

    it('handles empty values', () => {
      expect(formatGermanAddress()).toBe('-')
    })
  })

  describe('formatGermanPhoneNumber', () => {
    it('handles empty phone numbers', () => {
      expect(formatGermanPhoneNumber('')).toBe('-')
    })

    it('returns formatted phone number', () => {
      expect(formatGermanPhoneNumber('+49 123 456 789')).toBe('+49 123 456 789')
    })
  })

  describe('pluralize', () => {
    it('returns singular for count of 1', () => {
      expect(pluralize(1, 'Haus', 'Häuser')).toBe('Haus')
    })

    it('returns plural for count other than 1', () => {
      expect(pluralize(2, 'Haus', 'Häuser')).toBe('Häuser')
      expect(pluralize(0, 'Haus', 'Häuser')).toBe('Häuser')
    })
  })

  describe('getLocalizedText', () => {
    it('returns localized text for valid keys', () => {
      expect(getLocalizedText('search')).toBe('Suchen...')
      expect(getLocalizedText('export')).toBe('Exportieren')
    })

    it('returns key for invalid keys', () => {
      expect(getLocalizedText('invalidKey' as any)).toBe('invalidKey')
    })
  })

  describe('DATA_TABLE_TEXTS', () => {
    it('contains all required text keys', () => {
      expect(DATA_TABLE_TEXTS.search).toBe('Suchen...')
      expect(DATA_TABLE_TEXTS.export).toBe('Exportieren')
      expect(DATA_TABLE_TEXTS.loading).toBe('Lädt...')
      expect(DATA_TABLE_TEXTS.noData).toBe('Keine Daten verfügbar')
      expect(DATA_TABLE_TEXTS.selectAll).toBe('Alle auswählen')
      expect(DATA_TABLE_TEXTS.selectRow).toBe('Zeile auswählen')
      expect(DATA_TABLE_TEXTS.page).toBe('Seite')
      expect(DATA_TABLE_TEXTS.of).toBe('von')
      expect(DATA_TABLE_TEXTS.rowsPerPage).toBe('Zeilen pro Seite')
      expect(DATA_TABLE_TEXTS.firstPage).toBe('Zur ersten Seite')
      expect(DATA_TABLE_TEXTS.previousPage).toBe('Zur vorherigen Seite')
      expect(DATA_TABLE_TEXTS.nextPage).toBe('Zur nächsten Seite')
      expect(DATA_TABLE_TEXTS.lastPage).toBe('Zur letzten Seite')
    })

    it('contains property management specific terms', () => {
      expect(DATA_TABLE_TEXTS.house).toBe('Haus')
      expect(DATA_TABLE_TEXTS.houses).toBe('Häuser')
      expect(DATA_TABLE_TEXTS.apartment).toBe('Wohnung')
      expect(DATA_TABLE_TEXTS.apartments).toBe('Wohnungen')
      expect(DATA_TABLE_TEXTS.tenant).toBe('Mieter')
      expect(DATA_TABLE_TEXTS.rent).toBe('Miete')
      expect(DATA_TABLE_TEXTS.size).toBe('Größe')
      expect(DATA_TABLE_TEXTS.location).toBe('Ort')
      expect(DATA_TABLE_TEXTS.moveIn).toBe('Einzug')
      expect(DATA_TABLE_TEXTS.moveOut).toBe('Auszug')
      expect(DATA_TABLE_TEXTS.rented).toBe('Vermietet')
      expect(DATA_TABLE_TEXTS.free).toBe('Frei')
    })
  })
})