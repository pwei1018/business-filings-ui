import { Component, Vue } from 'vue-property-decorator'
import { mapState } from 'vuex'
import { isDate } from 'lodash'

const MS_IN_A_DAY = (1000 * 60 * 60 * 24)

/**
 * Mixin that provides some useful date utilities.
 */
@Component({
  computed: {
    ...mapState(['currentDate'])
  }
})
export default class DateMixin extends Vue {
  readonly currentDate!: string

  /**
   * Converts a Date object to a date string (YYYY-MM-DD) in Pacific timezone.
   * @example "2021-01-01 07:00:00 GMT" -> "2020-12-31"
   * @example "2021-01-01 08:00:00 GMT" -> "2021-01-01"
   * @example "2021-01-01 00:00:00 PST" -> "2021-01-01"
   * @example "2021-01-01 23:59:59 PST" -> "2021-01-01"
   */
  dateToDateString (date: Date): string {
    // safety check
    if (!isDate(date) || isNaN(date.getTime())) return null

    const dateStr = date.toLocaleDateString('en-CA', {
      timeZone: 'America/Vancouver'
    })

    return dateStr
  }

  /**
   * Converts a date string (YYYY-MM-DD) to a formatted date string (Month Day, Year).
   * @example "2020-01-01" -> "Jan 1, 2020"
   */
  formatDateString (dateStr: string): string {
    // safety checks
    if (!dateStr) return null
    if (dateStr.length !== 10) return null

    // create a Date object
    // then split into its components (in "absolute" time)
    // eg, "2020-01-01" -> "Wed, 01 Jan 2020 00:00:00 GMT"
    const date = new Date(dateStr)
    const [weekday, day, month, year, time, tz] = date.toUTCString().split(' ')

    // convert day to number so that "01" -> "1"
    return `${month} ${+day}, ${year}`
  }

  /**
   * Converts a Date object to a date string (Month Day, Year) in Pacific timezone.
   * @example "2021-01-01 07:00:00 GMT" -> "Dec 31, 2020"
   * @example "2021-01-01 08:00:00 GMT" -> "Jan 1, 2021"
   */
  dateToPacificDate (date: Date): string {
    // safety check
    if (!isDate(date) || isNaN(date.getTime())) return null

    let dateStr = date.toLocaleDateString('en-CA', {
      timeZone: 'America/Vancouver',
      month: 'short', // Dec.
      day: 'numeric', // 31
      year: 'numeric' // 2020
    })

    // remove period after month
    dateStr = dateStr.replace('.', '')
    return dateStr
  }

  /**
   * Converts a Date object to a time string (HH:MM am/pm) in Pacific timezone.
   * @example "2021-01-01 07:00:00 GMT" -> "11:00 pm"
   * @example "2021-01-01 08:00:00 GMT" -> "12:00 am"
   */
  dateToPacificTime (date: Date): string {
    // safety check
    if (!isDate(date) || isNaN(date.getTime())) return null

    let timeStr = date.toLocaleTimeString('en-CA', {
      timeZone: 'America/Vancouver',
      hour: 'numeric', // 11
      minute: '2-digit', // 00
      hour12: true // a.m./p.m.
    })

    // replace a.m. with am and p.m. with pm
    timeStr = timeStr.replace('a.m.', 'am').replace('p.m.', 'pm')

    return timeStr
  }

  /**
   * Converts an API datetime string (in UTC) to a Date object.
   */
  apiToDate (dateTimeString: string): Date {
    // chop off the milliseconds and append "Zulu" timezone abbreviation
    // eg, 2020-08-28T21:53:58Z
    dateTimeString = dateTimeString.slice(0, 19) + 'Z'
    return new Date(dateTimeString)
  }

  /**
   * Converts an API datetime string (in UTC) to a date string (Month Day, Year).
   * @example "2021-01-01T00:00:00.000000+00:00" -> "Dec 31, 2020" (PST example)
   * @example "2021-07-01T00:00:00.000000+00:00" -> "Jun 30, 2021" (PDT example)
   */
  apiToPacificDate (dateTimeString: string): string {
    if (!dateTimeString) return null // safety check

    const date = this.apiToDate(dateTimeString)

    return this.dateToPacificDate(date)
  }

  /**
   * Converts an API datetime string (in UTC) to a date and time string (Month Day, Year at HH:MM am/pm
   * Pacific time).
   * @example "2021-01-01T00:00:00.000000+00:00" -> "Dec 31, 2020 at 04:00 pm Pacific time" (PST example)
   * @example "2021-07-01T00:00:00.000000+00:00" -> "Jun 30, 2021 at 05:00 pm Pacific time" (PDT example)
   */
  apiToPacificDateTime (dateTimeString: string): string {
    if (!dateTimeString) return null // safety check

    const date = this.apiToDate(dateTimeString)
    const dateStr = this.dateToPacificDate(date)
    const timeStr = this.dateToPacificTime(date)

    return `${dateStr} at ${timeStr} Pacific time`
  }

  /**
   * Converts a date string (YYYY-MM-DD) to an API datetime string (in UTC).
   * @example "2021-01-01" -> 2021-01-01T08:00:00+00:00" // PST
   * @example "2021-07-01" -> 2021-07-01T07:00:00+00:00" // PDT
   */
  dateStringToApi (date: string): string {
    // safety check
    if (date?.length !== 10) return null

    // make sure the date is in correct format
    if (date.indexOf('/') >= 0) {
      date = date.replace('/', '-')
    }

    // create date using local timezone
    // eg, if `date` is "2020-08-26" and the local timezone is PDT
    // then `iso` will be "2020-08-26T07:00:00.000Z"
    const iso = new Date(date + 'T00:00:00').toISOString()

    // convert to API format
    // eg "2020-08-26T07:00:00.000Z" -> "2020-08-26T07:00:00+00:00"
    const api = iso.replace('.000Z', '+00:00')

    return api
  }

  /**
   * Compares two simple date strings (YYYY-MM-DD).
   * @param date1 the first date to compare
   * @param date2 the second date to compare
   * @param operator the operator to use for comparison
   * @returns the result of the comparison (true or false)
   */
  compareDates (date1: string, date2: string, operator: string): boolean {
    // safety check
    if (!date1 || !date2 || !operator) return true

    // convert dates to numbers (YYYYMMDD)
    date1 = date1.split('-').join('')
    date2 = date2.split('-').join('')

    return eval(date1 + operator + date2) // eslint-disable-line no-eval
  }

  /**
   * Returns the earliest of two simple date strings.
   * @param date1 first date
   * @param date2 second date
   */
  earliestDate (date1: string, date2: string): string {
    // safety check
    if (!date1 && !date2) return null

    // edge cases
    if (!date1) return date2
    if (!date2) return date1

    return (this.compareDates(date1, date2, '<') ? date1 : date2)
  }

  /**
   * Returns the latest of two simple date strings.
   * @param date1 first date
   * @param date2 second date
   */
  latestDate (date1: string, date2: string): string {
    // safety check
    if (!date1 && !date2) return null

    // edge cases
    if (!date1) return date2
    if (!date2) return date1

    return (this.compareDates(date1, date2, '>') ? date1 : date2)
  }

  /**
   * The number of days that 'date' is from today.
   * @returns -1 for yesterday
   * @returns 0 for today
   * @returns +1 for tomorrow
   * @returns NaN in case of error
   */
  daysFromToday (date: string): number {
    // safety check
    if (!date) return NaN

    // calculate difference between start of "today" and start of "date" (in local time)
    const todayLocalMs = new Date(this.currentDate).setHours(0, 0, 0, 0)
    const dateLocalMs = new Date(date).setHours(0, 0, 0, 0)
    return Math.round((dateLocalMs - todayLocalMs) / MS_IN_A_DAY)
  }
}
