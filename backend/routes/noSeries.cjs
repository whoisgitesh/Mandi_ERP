const express =
  require("express");

const router =
  express.Router();

const pool =
  require("../db.cjs");
const {
  hasIsActiveColumn,
} = require("../services/setupNoSeriesValidation.cjs");

async function ensureRelationshipsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.no_series_relationships (
      id SERIAL PRIMARY KEY,
      series_code VARCHAR(50) NOT NULL REFERENCES public.number_series(code) ON DELETE CASCADE,
      related_series_code VARCHAR(50) NOT NULL REFERENCES public.number_series(code) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_no_series_relationships UNIQUE (series_code, related_series_code),
      CONSTRAINT chk_no_series_relationship_not_self CHECK (series_code <> related_series_code)
    )
  `);
}

async function seriesExists(code) {
  const result = await pool.query(
    `SELECT 1 FROM number_series WHERE code = $1 LIMIT 1`,
    [code]
  );

  return result.rows.length > 0;
}

async function relationshipSeriesSelect(activeColumnExists) {
  return activeColumnExists
    ? `
      related.code AS related_series_code,
      related.description AS related_description,
      COALESCE(related.is_active, true) AS is_active
    `
    : `
      related.code AS related_series_code,
      related.description AS related_description,
      true AS is_active
    `;
}

async function relationshipOptionSelect(activeColumnExists) {
  return activeColumnExists
    ? `
      ns.code,
      ns.description,
      COALESCE(ns.is_active, true) AS is_active
    `
    : `
      ns.code,
      ns.description,
      true AS is_active
    `;
}

function nextNoFromLine(line) {
  if (!line) return null;
  if (!line.last_no_used) return line.starting_no ?? null;

  const match =
    String(line.last_no_used).match(/(.*?)(\d+)$/);

  if (!match) return null;

  return (
    match[1] +
    String(
      parseInt(match[2], 10) +
        Number(line.increment_by || 1)
    ).padStart(match[2].length, "0")
  );
}

/**
 * ============================================================
 * GET OPTIONS
 * ============================================================
 */
router.get(
  "/options",
  async (req, res) => {

    try {

      const activeColumnExists =
        await hasIsActiveColumn(pool);

      const result =
        await pool.query(
          activeColumnExists
            ? `
              SELECT
                code,
                description,
                is_active
              FROM number_series
              WHERE COALESCE(is_active, true) = true
              ORDER BY code
            `
            : `
              SELECT
                code,
                description
              FROM number_series
              ORDER BY code
            `
        );

      res.json({
        success: true,
        data: result.rows,
      });

    } catch (err) {

      console.error(
        "OPTIONS ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * GET ALL
 * ============================================================
 */
router.get(
  "/",
  async (req, res) => {

    try {

      const activeColumnExists =
        await hasIsActiveColumn(pool);

      const result =
        await pool.query(
          activeColumnExists
            ? `
              SELECT *
              FROM number_series
              WHERE COALESCE(is_active, true) = true
              ORDER BY code
            `
            : `
              SELECT *
              FROM number_series
              ORDER BY code
            `
        );

      res.json({
        success: true,
        data: result.rows,
      });

    } catch (err) {

      console.error(
        "GET SERIES ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * CREATE
 * ============================================================
 */
router.post(
  "/",
  async (req, res) => {

    try {

      const payload =
        req.body;

      const result =
        await pool.query(
          `
          INSERT INTO number_series
          (
            code,
            description,
            manual_nos,
            date_order
          )
          VALUES (
            $1,$2,$3,$4
          )
          ON CONFLICT (code)
          DO UPDATE SET
            description = EXCLUDED.description,
            manual_nos = EXCLUDED.manual_nos,
            date_order = EXCLUDED.date_order,
            updated_at = NOW()
          RETURNING *
          `,
          [
            payload.code,
            payload.description,
            payload.manual_nos ?? false,
            payload.date_order ?? false,
          ]
        );

      res.json({
        success: true,
        data: result.rows[0],
      });

    } catch (err) {

      console.error(
        "CREATE ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * UPDATE
 * ============================================================
 */
router.put(
  "/:code",
  async (req, res) => {

    try {

      const { code } =
        req.params;

      const payload =
        req.body;

      const result =
        await pool.query(
          `
          UPDATE number_series
          SET
            description = $1,
            manual_nos = $2,
            date_order = $3,
            updated_at = NOW()
          WHERE code = $4
          RETURNING *
          `,
          [
            payload.description,
            payload.manual_nos ?? false,
            payload.date_order ?? false,
            code,
          ]
        );

      res.json({
        success: true,
        data: result.rows[0],
      });

    } catch (err) {

      console.error(
        "UPDATE ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * DELETE
 * ============================================================
 */
router.delete(
  "/:code",
  async (req, res) => {

    try {

      const { code } =
        req.params;

      await pool.query(
        `
        DELETE FROM number_series
        WHERE code = $1
        `,
        [code]
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "DELETE ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * GET LINES
 * ============================================================
 */
router.get(
  "/:code/lines",
  async (req, res) => {

    try {

      const { code } =
        req.params;

      const result =
        await pool.query(
          `
          SELECT *
          FROM no_series_lines
          WHERE no_series_code = $1
          ORDER BY
            COALESCE(sequence_no, 2147483647),
            id::text
          `,
          [code]
        );

      res.json({
        success: true,
        data: result.rows,
      });

    } catch (err) {

      console.error(
        "GET LINES ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });
    }
  }
);

router.get(
  "/:code/with-relationships",
  async (req, res) => {
    try {
      await ensureRelationshipsTable();

      const { code } = req.params;

      if (!(await seriesExists(code))) {
        return res.status(404).json({
          success: false,
          message: `No. Series "${code}" does not exist`,
        });
      }

      const activeColumnExists = await hasIsActiveColumn(pool);

      const result = await pool.query(
        `
        WITH series_codes AS (
          SELECT
            ns.code,
            ns.description,
            false AS is_related,
            NULL::varchar AS relationship_source_code
          FROM number_series ns
          WHERE ns.code = $1
            ${activeColumnExists ? "AND COALESCE(ns.is_active, true) = true" : ""}

          UNION

          SELECT
            related.code,
            related.description,
            true AS is_related,
            rel.series_code AS relationship_source_code
          FROM no_series_relationships rel
          JOIN number_series related
            ON related.code = rel.related_series_code
          WHERE rel.series_code = $1
            ${activeColumnExists ? "AND COALESCE(related.is_active, true) = true" : ""}
        )
        SELECT
          sc.code,
          sc.description,
          line.id,
          line.id AS no_series_line_id,
          line.no_series_code,
          line.starting_no,
          line.ending_no,
          line.last_no_used,
          line.increment_by,
          line.open,
          line.sequence_no,
          sc.is_related,
          sc.relationship_source_code
        FROM series_codes sc
        LEFT JOIN no_series_lines line
          ON line.no_series_code = sc.code
        ORDER BY
          sc.is_related,
          sc.code,
          CASE WHEN COALESCE(line.open, true) = true THEN 0 ELSE 1 END,
          COALESCE(line.sequence_no, 2147483647),
          line.id::text
        `,
        [code]
      );

      res.json({
        success: true,
        data: result.rows.map((row) => ({
          ...row,
          next_no: nextNoFromLine(row),
        })),
      });
    } catch (err) {
      console.error("GET SERIES WITH RELATIONSHIPS ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * GET RELATIONSHIP OPTIONS
 * ============================================================
 */
router.get(
  "/:code/relationship-options",
  async (req, res) => {
    try {
      await ensureRelationshipsTable();

      const { code } = req.params;

      if (!(await seriesExists(code))) {
        return res.status(404).json({
          success: false,
          message: `No. Series "${code}" does not exist`,
        });
      }

      const activeColumnExists = await hasIsActiveColumn(pool);
      const selectClause = await relationshipOptionSelect(activeColumnExists);

      const result = await pool.query(
        `
        SELECT
          ${selectClause}
        FROM number_series ns
        WHERE ns.code <> $1
          ${activeColumnExists ? "AND COALESCE(ns.is_active, true) = true" : ""}
          AND NOT EXISTS (
            SELECT 1
            FROM no_series_relationships rel
            WHERE rel.series_code = $1
              AND rel.related_series_code = ns.code
          )
        ORDER BY ns.code
        `,
        [code]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (err) {
      console.error("GET RELATIONSHIP OPTIONS ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * GET RELATIONSHIPS
 * ============================================================
 */
router.get(
  "/:code/relationships",
  async (req, res) => {
    try {
      await ensureRelationshipsTable();

      const { code } = req.params;

      if (!(await seriesExists(code))) {
        return res.status(404).json({
          success: false,
          message: `No. Series "${code}" does not exist`,
        });
      }

      const activeColumnExists = await hasIsActiveColumn(pool);
      const relatedSelect = await relationshipSeriesSelect(activeColumnExists);

      const result = await pool.query(
        `
        SELECT
          rel.id,
          rel.series_code,
          ${relatedSelect},
          line.starting_no,
          line.ending_no,
          line.last_no_used,
          line.increment_by,
          line.open AS line_open
        FROM no_series_relationships rel
        JOIN number_series related
          ON related.code = rel.related_series_code
        LEFT JOIN LATERAL (
          SELECT
            starting_no,
            ending_no,
            last_no_used,
            increment_by,
            open
          FROM no_series_lines
          WHERE no_series_code = related.code
          ORDER BY
            COALESCE(sequence_no, 2147483647),
            id::text
          LIMIT 1
        ) line ON true
        WHERE rel.series_code = $1
        ORDER BY rel.related_series_code
        `,
        [code]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (err) {
      console.error("GET RELATIONSHIPS ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * ADD RELATIONSHIP
 * ============================================================
 */
router.post(
  "/:code/relationships",
  async (req, res) => {
    try {
      await ensureRelationshipsTable();

      const { code } = req.params;
      const relatedCode = String(req.body.related_series_code ?? "")
        .trim()
        .toUpperCase();

      if (!relatedCode) {
        return res.status(400).json({
          success: false,
          message: "Related Series Code is required",
        });
      }

      if (code === relatedCode) {
        return res.status(400).json({
          success: false,
          message: "A No. Series cannot be related to itself",
        });
      }

      if (!(await seriesExists(code))) {
        return res.status(404).json({
          success: false,
          message: `No. Series "${code}" does not exist`,
        });
      }

      if (!(await seriesExists(relatedCode))) {
        return res.status(400).json({
          success: false,
          message: `Related No. Series "${relatedCode}" does not exist`,
        });
      }

      const result = await pool.query(
        `
        INSERT INTO no_series_relationships (
          series_code,
          related_series_code
        )
        VALUES ($1, $2)
        ON CONFLICT (series_code, related_series_code) DO NOTHING
        RETURNING *
        `,
        [code, relatedCode]
      );

      if (result.rows.length === 0) {
        return res.status(409).json({
          success: false,
          message: "This relationship already exists",
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (err) {
      console.error("ADD RELATIONSHIP ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * DELETE RELATIONSHIP
 * ============================================================
 */
router.delete(
  "/:code/relationships/:relatedCode",
  async (req, res) => {
    try {
      await ensureRelationshipsTable();

      const { code, relatedCode } = req.params;

      await pool.query(
        `
        DELETE FROM no_series_relationships
        WHERE series_code = $1
          AND related_series_code = $2
        `,
        [code, relatedCode]
      );

      res.json({
        success: true,
      });
    } catch (err) {
      console.error("DELETE RELATIONSHIP ERROR:", err);
      res.status(500).json({
        success: false,
        message: err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * ADD LINE
 * ============================================================
 */
router.post(
  "/:code/lines",
  async (req, res) => {

    try {

      const { code } =
        req.params;

      const {
        starting_date,
        starting_no,
        ending_no,
        increment_by,
        open,
        allow_gaps,
        sequence_no,
      } = req.body;

      const result =
        await pool.query(
        `
        INSERT INTO no_series_lines
        (
          no_series_code,
          starting_date,
          starting_no,
          ending_no,
          last_no_used,
          increment_by,
          open,
          allow_gaps,
          sequence_no
        )
        VALUES (
          $1,$2,$3,$4,NULL,$5,$6,$7,$8
        )
        RETURNING *
        `,
        [
          code,
          starting_date || null,
          starting_no,
          ending_no || null,
          increment_by ?? 1,
          open ?? true,
          allow_gaps ?? false,
          sequence_no ?? null,
        ]
      );

      res.json({
        success: true,
        data: result.rows[0],
      });

    } catch (err) {

      console.error(
        "ADD LINE ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * NEXT NUMBER
 * ============================================================
 */
router.post(
  "/:code/next",
  async (req, res) => {

    const client =
      await pool.connect();

    try {

      await client.query(
        "BEGIN"
      );

      const { code } =
        req.params;

      const result =
        await client.query(
          `
          SELECT *
          FROM no_series_lines
          WHERE no_series_code = $1
          AND COALESCE(open, true) = true
          ORDER BY
            COALESCE(sequence_no, 2147483647),
            id::text
          LIMIT 1
          FOR UPDATE
          `,
          [code]
        );

      if (
        result.rows.length === 0
      ) {

        throw new Error(
          "No series line found"
        );
      }

      const line =
        result.rows[0];

      let formatted;

      if (
        !line.last_no_used
      ) {

        formatted =
          line.starting_no;

      } else {

        const match =
          line.last_no_used.match(
            /(.*?)(\\d+)$/
          );

        if (!match) {

          throw new Error(
            "Invalid number format"
          );
        }

        const prefix =
          match[1];

        const num =
          parseInt(
            match[2],
            10
          );

        formatted =
          prefix +
          String(
            num +
              (line.increment_by || 1)
          ).padStart(
            match[2].length,
            "0"
          );
      }

      await client.query(
        `
        UPDATE no_series_lines
        SET
          last_no_used = $1,
          last_date_used = CURRENT_DATE
        WHERE id = $2
        `,
        [
          formatted,
          line.id,
        ]
      );

      await client.query(
        "COMMIT"
      );

      res.json({
        number:
          formatted,
      });

    } catch (err) {

      await client.query(
        "ROLLBACK"
      );

      console.error(
        "NEXT NUMBER ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });

    } finally {

      client.release();
    }
  }
);

/**
 * ============================================================
 * UPDATE LINE
 * ============================================================
 */
router.put(
  "/lines/:id",
  async (req, res) => {

    try {

      const {
        starting_date,
        starting_no,
        ending_no,
        increment_by,
        open,
        allow_gaps,
        sequence_no,
      } = req.body;

      const result =
        await pool.query(
        `
        UPDATE no_series_lines
        SET
          starting_date = $1,
          starting_no = $2,
          ending_no = $3,
          increment_by = $4,
          open = $5,
          allow_gaps = $6,
          sequence_no = $7
        WHERE id = $8
        RETURNING *
        `,
        [
          starting_date || null,
          starting_no,
          ending_no || null,
          increment_by ?? 1,
          open ?? true,
          allow_gaps ?? false,
          sequence_no ?? null,
          req.params.id,
        ]
      );

      res.json({
        success: true,
        data: result.rows[0],
      });

    } catch (err) {

      console.error(
        "UPDATE LINE ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });
    }
  }
);

/**
 * ============================================================
 * DELETE LINE
 * ============================================================
 */
router.delete(
  "/lines/:id",
  async (req, res) => {

    try {

      await pool.query(
        `
        DELETE FROM no_series_lines
        WHERE id = $1
        `,
        [req.params.id]
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "DELETE LINE ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          err.message,
        error: err.message,
      });
    }
  }
);

module.exports =
  router;
