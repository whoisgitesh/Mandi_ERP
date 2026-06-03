const db = require('../db.cjs')

async function getNextNumber(seriesCode, lineId = null) {
  if (seriesCode) {
    const seriesResult = await db.query(
      `SELECT * FROM number_series WHERE code = $1`,
      [seriesCode]
    )

    if (seriesResult.rows.length === 0) {
      throw new Error(`No Series ${seriesCode} not found`)
    }
  }

  const client = await db.connect()

  try {
    await client.query('BEGIN')

    const result = lineId
      ? await client.query(
        `SELECT *
         FROM no_series_lines
         WHERE id = $1
           AND ($2::text IS NULL OR no_series_code = $2)
           AND COALESCE(open, true) = true
         FOR UPDATE`,
        [lineId, seriesCode]
      )
      : await client.query(
        `SELECT *
         FROM no_series_lines
         WHERE no_series_code = $1
           AND COALESCE(open, true) = true
         ORDER BY
           COALESCE(sequence_no, id),
           id
         LIMIT 1
         FOR UPDATE`,
        [seriesCode]
      )

    if (result.rows.length === 0) {
      throw new Error(`No Series Line for ${seriesCode || lineId} not found`)
    }

    const line = result.rows[0]
    const effectiveSeriesCode = seriesCode || line.no_series_code
    let formatted

    if (!line.last_no_used) {
      formatted = line.starting_no
    } else {
      const match = line.last_no_used.match(/(.*?)(\d+)$/)

      if (!match) {
        throw new Error(`Invalid last number format for ${effectiveSeriesCode}`)
      }

      const prefix = match[1]
      const width = match[2].length
      const next = parseInt(match[2], 10) + (line.increment_by || 1)

      formatted = prefix + String(next).padStart(width, '0')
    }

    await client.query(
      `UPDATE no_series_lines
       SET
         last_no_used = $1,
         last_date_used = CURRENT_DATE
       WHERE id = $2`,
      [formatted, line.id]
    )

    await client.query('COMMIT')

    return formatted
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function getSeriesCodeForPage(pageKey, fallbackCode, connection = db) {
  const result = await connection.query(
    `SELECT no_series_code
     FROM no_series_page_mapping
     WHERE page_key = $1
     LIMIT 1`,
    [pageKey]
  )

  const mappedCode = result.rows[0]?.no_series_code || fallbackCode

  const existsResult = await connection.query(
    `SELECT 1
     FROM number_series
     WHERE code = $1
     LIMIT 1`,
    [mappedCode]
  )

  if (existsResult.rows.length > 0) {
    return mappedCode
  }

  return fallbackCode
}

module.exports = {
  getNextNumber,
  getSeriesCodeForPage
}
