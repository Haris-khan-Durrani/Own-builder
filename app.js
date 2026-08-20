require('dotenv').config();
const express = require("express");
const path = require('path');
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cssbeautify = require('cssbeautify');
const beautify = require('js-beautify').html;

// const formidable = require('formidable');
// const fs = require('fs');

const app = express();
// Increase size limits
app.use(express.json({ limit: "500mb" })); // For JSON payloads
app.use(express.urlencoded({ limit: "500mb", extended: true })); // For URL-encoded payloads

// app.use('/assets', (req, res, next) => {
//   console.log('Request for asset:', req.url); // Log the requested URL
//   next();
// });

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store');
    }
}));

app.use('/uploads', (req, res, next) => {
    console.log('Request for:', req.url);
    next();
}, express.static(path.join(__dirname, 'uploads')));

// app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

app.use(cors());

const PORT = process.env.PORT || 4002;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public")); // For serving static files (CSS, JS, etc.)

// Set EJS as the templating engine
app.set("view engine", "ejs");

// MySQL Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Configure Multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname, 'public/assets/')); // Save files in the assets folder
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`); // Use a unique name for each file
//   },
// });

// Promisify the database connection
const dbPromise = db.promise();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit to 10MB
});

// app.post('/upload-media', upload.single('file[]'), async (req, res) => {
//     try {
//         console.log('File uploaded:', req.file);
//         if (!req.file) {
//             console.error('No file uploaded');
//             return res.status(400).json({ error: 'No file uploaded' });
//         }
//         const url = `https://builder.crmsoftware.ae/uploads/${req.file.filename}`;
//         const [result] = await dbPromise.query(
//             'INSERT INTO media (file_name, file_url) VALUES (?, ?)',
//             [req.file.originalname, url]
//         );
//         const insertedId = result.insertId;
//         console.log('Media inserted into database with ID:', insertedId);
//         res.status(200).json({ url, id: insertedId });
//     } catch (error) {
//         console.error('Error uploading file:', error);
//         res.status(500).json({ error: 'Failed to upload file' });
//     }
// });

app.post('/upload-media/:domain_id', upload.any(), async (req, res) => {
    try {
        const { domain_id } = req.params;
        let url;
        const uploadedFile = (req.files && req.files.length > 0) ? req.files[0] : req.file;

        if (uploadedFile) {
            url = `/uploads/${uploadedFile.filename}`;
        } else if (req.body.fileUrl) {
            url = req.body.fileUrl;
        } else {
            return res.status(400).json({ error: 'No file or URL provided' });
        }

        // Save the media entry
        const [result] = await dbPromise.query(
            'INSERT INTO media (file_name, file_url, domain_id) VALUES (?, ?, ?)',
            [uploadedFile ? uploadedFile.originalname : 'External URL', url, domain_id]
        );

        const insertedId = result.insertId;
        console.log('Media inserted into database with ID:', insertedId);

        res.status(200).json({ url, id: insertedId });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});



app.get('/fetch-media', async (req, res) => {
    try {
        const [rows] = await dbPromise.query('SELECT id, file_url AS src FROM media');
        console.log('Fetched media from database:', rows);
        const assets = rows.map(row => ({ id: row.id, src: row.src }));
        res.json(assets);
    } catch (error) {
        console.error('Error fetching media:', error);
        res.status(500).json({ error: 'Failed to fetch media' });
    }
});


app.delete('/delete-media', async (req, res) => {
    try {
        const { id } = req.body;
        console.log('Delete request received for media ID:', id);

        if (!id) {
            console.error('No ID provided in the request body');
            return res.status(400).json({ error: 'Media ID is required' });
        }

        // Get the file URL from the database
        const [rows] = await dbPromise.query('SELECT file_url FROM media WHERE id = ?', [id]);
        console.log('Database query result for delete:', rows);

        if (rows.length > 0) {
            const filePath = rows[0].file_url.replace('https://builder.crmsoftware.ae/uploads/', 'uploads/');
            console.log('File path to delete:', filePath);

            // Delete the file
            fs.unlink(filePath, async (err) => {
                if (err) {
                    console.error('File deletion error:', err);
                    return res.status(500).json({ error: 'File deletion failed' });
                }
                console.log('File deleted successfully:', filePath);

                // Remove from the database
                await dbPromise.query('DELETE FROM media WHERE id = ?', [id]);
                console.log('Media record deleted from database with ID:', id);
                return res.status(200).json({ success: true });
            });
        } else {
            console.error('Media not found for ID:', id);
            return res.status(404).json({ error: 'Media not found' });
        }
    } catch (error) {
        console.error('Error in delete-media route:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});



// Route for uploading images
app.post('/upload', (req, res, next) => {
  console.log('Request body before Multer:', req.body);
  console.log('Request files before Multer:', req.file);
  next();
}, upload.single('file[]'), (req, res) => {
  console.log('Received file:', req.file);
  console.log('Request body:', req.body);
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const fileUrl = `/public/assets/${req.file.filename}`; // Fix the URL path
  
  res.json({ success: true, fileUrl });
}, (err, req, res, next) => {
  console.error('Error during file upload:', err); // Log the actual error
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});



// Endpoint to fetch all assets (list of images in the assets folder)
app.get('/assets', (req, res) => {
  const assetsDir = path.join(__dirname, '/public/assets');
  const fs = require('fs');
  const baseUrl = 'https://builder.crmsoftware.ae'; // Update this to match your domain

  fs.readdir(assetsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read assets directory' });
    }
    // Filter only image files (you can expand this if you support more file types)
    const imageFiles = files.filter(file => file.match(/\.(jpg|jpeg|png|gif)$/i));
    const assets = imageFiles.map(file => ({ 
      type: 'image', 
      src: `${baseUrl}/public/assets/${file}`, // Provide the full URL
    }));
    res.json({ assets });
  });
});




async function ensureMasterDatabaseSchema() {
    try {
        console.log("🔍 Checking and synchronizing database tables & schema...");

        // 1. Create domain_config table if not exists
        await dbPromise.query(`
          CREATE TABLE IF NOT EXISTS domain_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domain_name VARCHAR(255),
            logo_url VARCHAR(500),
            brand_primary_color VARCHAR(50) DEFAULT '#ff4c00',
            brand_secondary_color VARCHAR(50) DEFAULT '#0a2540',
            brand_font_family VARCHAR(100) DEFAULT 'Arial, sans-serif',
            cover_page_html MEDIUMTEXT NULL,
            inner_page_html MEDIUMTEXT NULL,
            closing_page_html MEDIUMTEXT NULL,
            global_css MEDIUMTEXT NULL,
            Banktile VARCHAR(255),
            Accountnumber VARCHAR(100),
            Ibannumber VARCHAR(100),
            bank VARCHAR(255)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check columns for domain_config
        const [dcCols] = await dbPromise.query("SHOW COLUMNS FROM domain_config");
        const dcNames = dcCols.map(c => c.Field);
        const dcNeeded = [
            { name: 'cover_page_html', type: 'MEDIUMTEXT NULL' },
            { name: 'inner_page_html', type: 'MEDIUMTEXT NULL' },
            { name: 'closing_page_html', type: 'MEDIUMTEXT NULL' },
            { name: 'brand_primary_color', type: "VARCHAR(50) DEFAULT '#ff4c00'" },
            { name: 'brand_secondary_color', type: "VARCHAR(50) DEFAULT '#0a2540'" },
            { name: 'brand_font_family', type: "VARCHAR(100) DEFAULT 'Arial, sans-serif'" },
            { name: 'global_css', type: 'MEDIUMTEXT NULL' },
            { name: 'Banktile', type: 'VARCHAR(255) NULL' },
            { name: 'Accountnumber', type: 'VARCHAR(100) NULL' },
            { name: 'Ibannumber', type: 'VARCHAR(100) NULL' },
            { name: 'bank', type: 'VARCHAR(255) NULL' }
        ];
        for (const col of dcNeeded) {
            if (!dcNames.includes(col.name)) {
                await dbPromise.query(`ALTER TABLE domain_config ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added missing column ${col.name} to domain_config`);
            }
        }

        // 2. Create global_branding_settings table if not exists
        await dbPromise.query(`
          CREATE TABLE IF NOT EXISTS global_branding_settings (
            setting_id INT AUTO_INCREMENT PRIMARY KEY,
            domain_id INT NOT NULL UNIQUE,
            company_logo VARCHAR(500),
            cover_bg_image VARCHAR(500),
            inner_bg_image VARCHAR(500),
            closing_bg_image VARCHAR(500),
            addon_images LONGTEXT,
            custom_colors LONGTEXT,
            primary_color VARCHAR(50) DEFAULT '#ff4c00',
            secondary_color VARCHAR(50) DEFAULT '#0a2540',
            font_family VARCHAR(100) DEFAULT 'Arial, sans-serif',
            bank_title VARCHAR(255),
            account_number VARCHAR(100),
            iban_number VARCHAR(100),
            bank_name VARCHAR(255),
            default_table_theme VARCHAR(50) DEFAULT 'navy-corporate',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check columns for global_branding_settings
        const [gbsCols] = await dbPromise.query("SHOW COLUMNS FROM global_branding_settings");
        const gbsNames = gbsCols.map(c => c.Field);
        const gbsNeeded = [
            { name: 'cover_bg_image', type: 'VARCHAR(500) NULL' },
            { name: 'inner_bg_image', type: 'VARCHAR(500) NULL' },
            { name: 'closing_bg_image', type: 'VARCHAR(500) NULL' },
            { name: 'addon_images', type: 'LONGTEXT NULL' },
            { name: 'custom_colors', type: 'LONGTEXT NULL' },
            { name: 'bank_title', type: 'VARCHAR(255) NULL' },
            { name: 'account_number', type: 'VARCHAR(100) NULL' },
            { name: 'iban_number', type: 'VARCHAR(100) NULL' },
            { name: 'bank_name', type: 'VARCHAR(255) NULL' },
            { name: 'default_table_theme', type: "VARCHAR(50) DEFAULT 'navy-corporate'" }
        ];
        for (const col of gbsNeeded) {
            if (!gbsNames.includes(col.name)) {
                await dbPromise.query(`ALTER TABLE global_branding_settings ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added missing column ${col.name} to global_branding_settings`);
            }
        }

        // 3. Create global_blocks table if not exists
        await dbPromise.query(`
          CREATE TABLE IF NOT EXISTS global_blocks (
            block_id INT AUTO_INCREMENT PRIMARY KEY,
            block_slug VARCHAR(100) UNIQUE NOT NULL,
            block_name VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL DEFAULT 'General',
            html_content MEDIUMTEXT NOT NULL,
            css_content MEDIUMTEXT,
            domain_id INT DEFAULT 2,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 4. Create media table if not exists
        await dbPromise.query(`
          CREATE TABLE IF NOT EXISTS media (
            id INT AUTO_INCREMENT PRIMARY KEY,
            file_name VARCHAR(255),
            file_url VARCHAR(500) NOT NULL,
            domain_id INT DEFAULT 2,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 5. Create template table if not exists
        await dbPromise.query(`
          CREATE TABLE IF NOT EXISTS template (
            template_id INT AUTO_INCREMENT PRIMARY KEY,
            template_title VARCHAR(255) NOT NULL,
            template MEDIUMTEXT,
            css MEDIUMTEXT,
            jscript MEDIUMTEXT,
            json MEDIUMTEXT,
            domain_id INT DEFAULT 2,
            created_user_id INT DEFAULT 1,
            table_theme VARCHAR(50) DEFAULT 'domain',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Check & add table_theme column to template if missing
        const [tplCols] = await dbPromise.query("SHOW COLUMNS FROM template");
        const tplNames = tplCols.map(c => c.Field);
        if (!tplNames.includes('table_theme')) {
            await dbPromise.query("ALTER TABLE template ADD COLUMN table_theme VARCHAR(50) DEFAULT 'domain'");
            console.log('✅ Added missing column table_theme to template');
        }
        if (!tplNames.includes('custom_jscript')) {
            await dbPromise.query("ALTER TABLE template ADD COLUMN custom_jscript MEDIUMTEXT NULL");
            console.log('✅ Added missing column custom_jscript to template');
        }

        console.log("✅ Database schema synchronization completed successfully!");
    } catch (err) {
        console.error("⚠️ Error ensuring database schema:", err.message);
    }
}

async function fetchGlobalBlocksMap(domainId) {
    try {
        const [rows] = await dbPromise.query(
            "SELECT block_slug, html_content FROM global_blocks WHERE domain_id = ? OR domain_id IS NULL OR domain_id = 0",
            [domainId]
        );
        const map = {};
        rows.forEach(r => {
            map[r.block_slug] = r.html_content;
        });
        return map;
    } catch (err) {
        console.error("Error fetching global blocks map:", err.message);
        return {};
    }
}

function injectGlobalBlocks(templateHtml, blocksMap) {
    if (!templateHtml || !blocksMap) return templateHtml;
    let html = templateHtml;
    Object.keys(blocksMap).forEach(slug => {
        const tag = `[BLOCK:${slug}]`;
        if (html.includes(tag)) {
            html = html.split(tag).join(blocksMap[slug]);
        }
    });
    return html;
}

db.connect(async (err) => {
  if (err) throw err;
  console.log("Connected to MySQL database!");
  await ensureMasterDatabaseSchema();
});

function injectGlobalBranding(templateHtml, domainConfig, brandingObj) {
    if (!domainConfig) return templateHtml;

    const coverBg = (brandingObj && brandingObj.cover_bg_image) || 'https://pp.ebmsbusiness.com/wp-content/uploads/2022/11/1-724x1024-1.jpg';

    let defaultCover = domainConfig.cover_page_html || `
<div class="global-cover-page-wrapper" data-gjs-type="global-cover-page">
  <table class="c11w5" style="width: 795px; height:1098px; margin: 0; padding: 0; background-size: contain; background-image: url('${coverBg}');">
    <tr>
      <td valign="top">
        <div class="global-cover-content-slot" data-gjs-droppable="true">
          <!-- COVER CONTENT -->
        </div>
      </td>
    </tr>
  </table>
</div>`;

    defaultCover = defaultCover.replace(/https:\/\/pp\.ebmsbusiness\.com\/wp-content\/uploads\/2022\/11\/1-724x1024-1\.jpg/gi, coverBg);

    const defaultInnerPage = domainConfig.inner_page_html || `
<div class="global-inner-page-wrapper" data-gjs-type="global-inner-page">
  <div class="global-page-header-banner" style="background: var(--brand-secondary, #0a2540); color: #fff; padding: 12px 20px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
    <div class="header-logo"><img src="${domainConfig.logo_url || ''}" style="max-height: 40px;" /></div>
    <div class="header-contact">Visit: www.360bizconsultants.com | Office 1302, City Tower 2, Dubai</div>
  </div>
  <div class="global-inner-page-content-slot" data-gjs-droppable="true">
    <!-- INNER PAGE CONTENT SLOT -->
  </div>
  <div class="global-page-footer-banner" style="border-top: 2px solid var(--brand-primary, #ff4c00); padding: 8px 20px; font-size: 11px; text-align: center; color: #555;">
    Official Business Proposal - All Rights Reserved
  </div>
</div>`;

    const defaultClosingPage = domainConfig.closing_page_html || `
<div class="global-closing-page-wrapper" data-gjs-type="global-closing-page">
  <div style="padding: 40px; text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; margin-top: 30px;">
    <h3 style="color: var(--brand-primary, #ff4c00);">Thank You For Your Business</h3>
    <p>For inquiries, please reach out to your sales consultant or visit our office.</p>
  </div>
</div>`;

    let html = templateHtml || '';

    // Automatically replace old legacy cover URLs in template HTML with active coverBg
    html = html.replace(/https:\/\/pp\.ebmsbusiness\.com\/wp-content\/uploads\/2022\/11\/1-724x1024-1\.jpg/gi, coverBg);

    if (html.includes('[GLOBAL_COVER_PAGE]')) {
        html = html.replace(/\[GLOBAL_COVER_PAGE\]([\s\S]*?)\[\/GLOBAL_COVER_PAGE\]/g, (match, p1) => {
            return defaultCover.replace('<!-- COVER CONTENT -->', p1 || '');
        });
        html = html.replace(/\[GLOBAL_COVER_PAGE\]/g, defaultCover);
    }

    if (html.includes('[GLOBAL_INNER_PAGE]')) {
        html = html.replace(/\[GLOBAL_INNER_PAGE\]([\s\S]*?)\[\/GLOBAL_INNER_PAGE\]/g, (match, p1) => {
            return defaultInnerPage.replace('<!-- INNER PAGE CONTENT SLOT -->', p1 || '');
        });
        html = html.replace(/\[GLOBAL_INNER_PAGE\]/g, defaultInnerPage);
    }

    if (html.includes('[GLOBAL_CLOSING_PAGE]')) {
        html = html.replace(/\[GLOBAL_CLOSING_PAGE\]([\s\S]*?)\[\/GLOBAL_CLOSING_PAGE\]/g, (match, p1) => {
            return defaultClosingPage.replace('<!-- CLOSING CONTENT -->', p1 || '');
        });
        html = html.replace(/\[GLOBAL_CLOSING_PAGE\]/g, defaultClosingPage);
    }

    return html;
}

function extractGlobalPlaceholders(savedHtml) {
    if (!savedHtml) return savedHtml;
    let html = savedHtml;

    const coverRegex = /<div[^>]*class="[^"]*global-cover-page-wrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    html = html.replace(coverRegex, (match, innerContent) => {
        const slotMatch = innerContent.match(/<div[^>]*class="[^"]*global-cover-content-slot[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const content = slotMatch ? slotMatch[1] : innerContent;
        return `[GLOBAL_COVER_PAGE]${content}[/GLOBAL_COVER_PAGE]`;
    });

    const innerRegex = /<div[^>]*class="[^"]*global-inner-page-wrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    html = html.replace(innerRegex, (match, innerContent) => {
        const slotMatch = innerContent.match(/<div[^>]*class="[^"]*global-inner-page-content-slot[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const content = slotMatch ? slotMatch[1] : innerContent;
        return `[GLOBAL_INNER_PAGE]${content}[/GLOBAL_INNER_PAGE]`;
    });

    const closingRegex = /<div[^>]*class="[^"]*global-closing-page-wrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    html = html.replace(closingRegex, (match, innerContent) => {
        return `[GLOBAL_CLOSING_PAGE]${innerContent}[/GLOBAL_CLOSING_PAGE]`;
    });

    return html;
}

// ── TABLE THEME CSS ENGINE (Disabled by default so user has 100% control over design) ──
function buildTableThemeCSS(theme) {
    return '';
}

function buildCombinedCSS(templateCss, domainConfig, brandingObj) {
    const primary = (brandingObj && brandingObj.primary_color) || (domainConfig && domainConfig.brand_primary_color) || '#ff4c00';
    const secondary = (brandingObj && brandingObj.secondary_color) || (domainConfig && domainConfig.brand_secondary_color) || '#0a2540';
    const font = (brandingObj && brandingObj.font_family) || (domainConfig && domainConfig.brand_font_family) || 'Arial, sans-serif';
    const customGlobalCSS = (domainConfig && domainConfig.global_css) || '';

    const coverBg = (brandingObj && brandingObj.cover_bg_image) || 'https://pp.ebmsbusiness.com/wp-content/uploads/2022/11/1-724x1024-1.jpg';
    const innerBg = (brandingObj && brandingObj.inner_bg_image) || '';
    const closingBg = (brandingObj && brandingObj.closing_bg_image) || '';

    let customAddonCSSVars = '';
    let customAddonClasses = '';
    let customColorCSSVars = '';
    let customColorClasses = '';

    if (brandingObj && brandingObj.addon_images) {
      try {
        const list = typeof brandingObj.addon_images === 'string' ? JSON.parse(brandingObj.addon_images) : brandingObj.addon_images;
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item && item.label && item.url) {
              const safeLabel = item.label.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
              customAddonCSSVars += `  --custom-img-${safeLabel}: url('${item.url}');\n`;
              customAddonClasses += `.custom-img-${safeLabel} { background-image: var(--custom-img-${safeLabel}) !important; background-size: contain !important; background-repeat: no-repeat !important; }\n`;
            }
          });
        }
      } catch(e){}
    }

    if (brandingObj && brandingObj.custom_colors) {
      try {
        const colorList = typeof brandingObj.custom_colors === 'string' ? JSON.parse(brandingObj.custom_colors) : brandingObj.custom_colors;
        if (Array.isArray(colorList)) {
          colorList.forEach(item => {
            if (item && item.label && item.hex) {
              const safeLabel = item.label.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
              customColorCSSVars += `  --color-${safeLabel}: ${item.hex};\n`;
              customColorClasses += `.custom-color-${safeLabel} { color: var(--color-${safeLabel}) !important; }\n`;
              customColorClasses += `.custom-bg-${safeLabel} { background-color: var(--color-${safeLabel}) !important; }\n`;
            }
          });
        }
      } catch(e){}
    }

    const rootVars = `
:root {
  --brand-primary: ${primary};
  --brand-secondary: ${secondary};
  --brand-font: ${font};
  --cover-bg: url('${coverBg}');
  --inner-bg: url('${innerBg}');
  --closing-bg: url('${closingBg}');
${customAddonCSSVars}${customColorCSSVars}}

body {
  font-family: var(--brand-font);
}

${customAddonClasses}
${customColorClasses}
.global-cover-bg {
  background-image: var(--cover-bg) !important;
  background-size: cover !important;
  background-position: center !important;
}

.global-inner-bg {
  background-image: var(--inner-bg) !important;
  background-size: cover !important;
  background-position: center !important;
}

.global-closing-bg {
  background-image: var(--closing-bg) !important;
  background-size: cover !important;
  background-position: center !important;
}

.global-page-header-banner {
  background-color: var(--brand-secondary) !important;
}

.global-page-footer-banner {
  border-top-color: var(--brand-primary) !important;
}

${customGlobalCSS}
`;

    let cleanTemplateCss = templateCss || '';
    cleanTemplateCss = cleanTemplateCss.split('url([cover_bg_image])').join(`url('${coverBg}')`);
    cleanTemplateCss = cleanTemplateCss.split('url("[cover_bg_image]")').join(`url('${coverBg}')`);
    cleanTemplateCss = cleanTemplateCss.split("url('[cover_bg_image]')").join(`url('${coverBg}')`);
    cleanTemplateCss = cleanTemplateCss.split('[cover_bg_image]').join(coverBg);
    cleanTemplateCss = cleanTemplateCss.split('[inner_bg_image]').join(innerBg);
    cleanTemplateCss = cleanTemplateCss.split('[closing_bg_image]').join(closingBg);
    cleanTemplateCss = cleanTemplateCss.split('[company_logo]').join(brandingObj && brandingObj.company_logo ? brandingObj.company_logo : '');

    if (brandingObj && brandingObj.addon_images) {
      try {
        const list = typeof brandingObj.addon_images === 'string' ? JSON.parse(brandingObj.addon_images) : brandingObj.addon_images;
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item && item.label && item.url) {
              const safeLabel = item.label.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
              cleanTemplateCss = cleanTemplateCss.split(`[custom_img:${safeLabel}]`).join(item.url);
              cleanTemplateCss = cleanTemplateCss.split(`[${safeLabel}]`).join(item.url);
            }
          });
        }
      } catch(e){}
    }

    return rootVars + '\n' + cleanTemplateCss;
}

// Route to show all templates
app.get("/", (req, res) => {
    const query = "SELECT * FROM template";
    db.query(query, (err, results) => {
      if (err) return res.status(500).send(err);

      res.render("index", {
        templates: results,  // Pass the list of templates to the EJS view
      });
    });
});

app.get("/template/:tid", async (req, res) => {
    const { tid } = req.params;
    const { domain_id, token } = req.query;

    if (!token) {
        return res.status(401).send("Unauthorized: Token is required");
    }

    if (!domain_id) {
        return res.status(400).send("domain_id is required");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [domainConfigRows] = await dbPromise.query('SELECT * FROM domain_config WHERE id = ?', [domain_id]);

        let domainConfigObj;
        if (domainConfigRows.length === 0) {
            const [fallbackRows] = await dbPromise.query('SELECT * FROM domain_config ORDER BY id ASC LIMIT 1');
            domainConfigObj = fallbackRows[0] || { id: domain_id, logo_url: '', brand_primary_color: '#ff4c00', brand_secondary_color: '#0a2540', brand_font_family: 'Arial, sans-serif' };
        } else {
            domainConfigObj = domainConfigRows[0];
        }

        const [rows] = await dbPromise.query('SELECT id, file_url AS src FROM media WHERE domain_id = ?', [domain_id]);
        const [brandingRows] = await dbPromise.query("SELECT * FROM global_branding_settings WHERE domain_id = ?", [domain_id]);
        const brandingObj = brandingRows[0] || {};

        const formattedAssets = rows.map(row => ({
            id: row.id,
            src: row.src
        }));

        const realCoverBg = brandingObj.cover_bg_image || 'https://pp.ebmsbusiness.com/wp-content/uploads/2022/11/1-724x1024-1.jpg';
        const realInnerBg = brandingObj.inner_bg_image;
        const realClosingBg = brandingObj.closing_bg_image;
        const realLogo = brandingObj.company_logo || domainConfigObj.logo_url;

        if (realLogo && !realLogo.startsWith('[')) formattedAssets.unshift({ id: 'domain_logo', src: realLogo, name: '🌐 Company Logo' });
        if (realCoverBg && !realCoverBg.startsWith('[')) formattedAssets.unshift({ id: 'cover_bg', src: realCoverBg, name: '🌐 Cover Page Background' });
        if (realInnerBg && !realInnerBg.startsWith('[')) formattedAssets.unshift({ id: 'inner_bg', src: realInnerBg, name: '🌐 Inner Page Background' });
        let customAddonList = [];
        if (brandingObj.addon_images) {
          try {
            customAddonList = typeof brandingObj.addon_images === 'string' ? JSON.parse(brandingObj.addon_images) : brandingObj.addon_images;
          } catch(e) {
            const items = String(brandingObj.addon_images).split(',');
            customAddonList = items.map((url, idx) => ({ label: `addon_${idx+1}`, url: url.trim() })).filter(i => i.url);
          }
        }

        if (Array.isArray(customAddonList)) {
          customAddonList.forEach(item => {
            if (item && item.url && item.label && !item.url.startsWith('[')) {
              formattedAssets.unshift({
                id: 'addon_' + item.label,
                src: item.url,
                name: '🏷️ Addon: ' + item.label
              });
            }
          });
        }

        const query = "SELECT * FROM template WHERE template_id = ?";
        db.query(query, [tid], async (err, results) => {
            if (err) return res.status(500).send(err);

            if (results.length === 0) return res.status(404).send("Template not found");

            const template = results[0];
            const blocksMap = await fetchGlobalBlocksMap(domain_id);

            // Dynamically inject global branding elements, modular blocks & theme CSS
            let htmlWithBranding = injectGlobalBranding(template.template, domainConfigObj, brandingObj);
            let htmlWithBlocks = injectGlobalBlocks(htmlWithBranding, blocksMap);
            
            // Keep shortcodes intact in template HTML so editor works with shortcodes natively
            const processedTemplate = {
                ...template,
                template: htmlWithBlocks,
                css: buildCombinedCSS(template.css, domainConfigObj, brandingObj)
            };

            res.render("template_details", {
                template: processedTemplate,
                domain_id: domain_id,
                domain: domainConfigObj,
                branding: brandingObj,
                ass: formattedAssets,
                token: token,
                template_table_theme: template.table_theme || 'domain',
                domain_table_theme: brandingObj.default_table_theme || 'navy-corporate',
            });
        });

    } catch (error) {
        console.error("Token validation error:", error.message);
        return res.status(403).send("Invalid or expired token");
    }
});

function beautifyHTML(htmlCode) {
    return beautify(htmlCode, {
        indent_size: 2,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        wrap_attributes: 'auto',
        indent_inner_html: true,
        unformatted: ['pre', 'code', 'textarea'],
        content_unformatted: ['script', 'style'],
    });
}

function beautifyCSS(cssCode) {
    return cssbeautify(cssCode, {
        openbrace: 'end-of-line',
        autosemicolon: true
    });
}

function deduplicateCSS(cssCode) {
    if (!cssCode) return cssCode;
    const rules = [];
    const regex = /([^{]+)\{([^}]*)\}/g;
    let match;
    while ((match = regex.exec(cssCode)) !== null) {
        rules.push({ selector: match[1].trim(), content: match[2].trim() });
    }
    if (rules.length === 0) return cssCode;
    const uniqueRules = new Map();
    rules.forEach(rule => {
        uniqueRules.set(rule.selector, rule.content);
    });
    let result = '';
    uniqueRules.forEach((content, selector) => {
        result += `${selector} {\n  ${content}\n}\n\n`;
    });
    return result;
}

async function normalizeShortcodesBeforeSave(html, css, domainId) {
    if (!domainId) return { html, css };
    try {
        const [rows] = await dbPromise.query("SELECT * FROM global_branding_settings WHERE domain_id = ?", [domainId]);
        const [domainConfigRows] = await dbPromise.query("SELECT * FROM domain_config WHERE id = ?", [domainId]);
        
        const b = rows[0] || {};
        const d = domainConfigRows[0] || {};

        const coverBg = b.cover_bg_image;
        const innerBg = b.inner_bg_image;
        const closingBg = b.closing_bg_image;
        const logo = b.company_logo || d.logo_url;

        let cleanHtml = html || '';
        let cleanCss = css || '';

        // Replace resolved URLs back to shortcodes so database ALWAYS preserves shortcodes!
        const legacyCoverUrls = [
            coverBg,
            'https://pp.ebmsbusiness.com/wp-content/uploads/2022/11/1-724x1024-1.jpg',
            'https://pp.ebmsbusiness.com/wp-content/uploads/2022/11/1-724x1024-1.png',
            '/uploads/1786902285941-CoverMain.png'
        ].filter(u => u && u.length > 5);

        legacyCoverUrls.forEach(url => {
            cleanHtml = cleanHtml.split(url).join('[cover_bg_image]');
            cleanCss = cleanCss.split(url).join('[cover_bg_image]');
        });
        if (innerBg && innerBg.length > 5) {
            cleanHtml = cleanHtml.split(innerBg).join('[inner_bg_image]');
            cleanCss = cleanCss.split(innerBg).join('[inner_bg_image]');
        }
        if (closingBg && closingBg.length > 5) {
            cleanHtml = cleanHtml.split(closingBg).join('[closing_bg_image]');
            cleanCss = cleanCss.split(closingBg).join('[closing_bg_image]');
        }
        if (logo && logo.length > 5) {
            cleanHtml = cleanHtml.split(logo).join('[company_logo]');
            cleanCss = cleanCss.split(logo).join('[company_logo]');
        }

        // Addon custom images
        if (b.addon_images) {
            try {
                const list = typeof b.addon_images === 'string' ? JSON.parse(b.addon_images) : b.addon_images;
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        if (item && item.label && item.url && item.url.length > 5) {
                            const safeLabel = item.label.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
                            cleanHtml = cleanHtml.split(item.url).join(`[custom_img:${safeLabel}]`);
                            cleanCss = cleanCss.split(item.url).join(`[custom_img:${safeLabel}]`);
                        }
                    });
                }
            } catch(e){}
        }

        // Remove injected :root vars and forced table theme CSS so unwanted blue backgrounds are never saved in DB
        cleanCss = cleanCss.replace(/:root\s*\{[\s\S]*?\}/gi, '');
        cleanCss = cleanCss.replace(/body\s*\{\s*font-family:\s*var\(--brand-font\);\s*\}/gi, '');
        cleanCss = cleanCss.replace(/\/\* ── Proposal Table Theme:[\s\S]*?\*\//gi, '');
        cleanCss = cleanCss.replace(/\.proposal-table[\s\S]*?\}\n\n/gi, '');
        cleanCss = cleanCss.replace(/table\s+th\s*\{\s*background-color:\s*var\(--brand-primary[^\}]*?\}/gi, '');

        return { html: cleanHtml, css: cleanCss };
    } catch(err) {
        console.error("Error normalizing shortcodes before save:", err);
        return { html, css };
    }
}

// Save updated template
app.post("/save", async (req, res) => {
    let { tempid, html, csos, jscript, titl, json, domainId, table_theme } = req.body;

    const cleanedHtml = extractGlobalPlaceholders(html);
    csos = deduplicateCSS(csos);
    const beautifiedCSS = beautifyCSS(csos);

    const normalized = await normalizeShortcodesBeforeSave(cleanedHtml, beautifiedCSS, domainId);

    console.log("Received template data to save:", tempid, titl, domainId);
    
    const safeTableTheme = table_theme || 'domain';
    const query = `
      UPDATE template
      SET template = ?, css = ?, jscript = ?, json = ?, domain_id=?, template_title = ?, table_theme = ?, updated_at = NOW()
      WHERE template_id = ?
    `;
    
    db.query(query, [normalized.html, normalized.css, jscript, json, domainId, titl, safeTableTheme, tempid], (err, result) => {
      if (err) {
        console.error("Error saving template:", err);
        return res.status(500).json({ error: "Failed to save template" });
      }
      
      console.log("Template saved successfully with shortcodes preserved:", result);
      res.status(200).json({ message: "Template saved successfully!" });
    });
});

function beautifyHTML(code) {
    if (!code) return '';
    try {
        return beautify(code, { indent_size: 2, space_in_empty_paren: true });
    } catch (e) {
        return code;
    }
}

function beautifyCSS(code) {
    if (!code) return '';
    try {
        return cssbeautify(code, { indent: '  ', openbrace: 'end-of-line', autosemicolon: true });
    } catch (e) {
        return code;
    }
}

function deduplicateCSS(cssStr) {
    if (!cssStr) return '';
    return cssStr;
}

// Route for editing a template
app.get('/edit-template', async (req, res) => {
    const { tmpid, domain_id, token } = req.query;

    if (!token || !domain_id || !tmpid) {
        return res.status(400).send("Bad Request: tmpid, domain_id and token are required");
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);

        const query = `SELECT * FROM template WHERE template_id = ?`;
        db.query(query, [tmpid], (err, results) => {
            if (err) {
                console.error("Error fetching template:", err);
                return res.status(500).send("Internal Server Error");
            }

            if (results.length === 0) {
                return res.status(404).send("Template not found");
            }

            const template = results[0];
            const jsContent = template.custom_jscript || template.jscript || '';
            res.render('edit_template', {
                title: template.template_title || 'Untitled Template',
                html: beautifyHTML(template.template || ''),
                css: beautifyCSS(template.css || ''),
                js: jsContent,
                customjs: jsContent,
                templateId: tmpid,
                domain_id: domain_id,
                token: token
            });
        });
    } catch (error) {
        console.error("Token validation error:", error.message);
        return res.status(403).send("Invalid or expired token");
    }
});

// Save the edited template
app.post('/save-template', (req, res) => {
    let { templateId, html, css, custom_js, domainId } = req.body;

    if (!templateId) {
        return res.status(400).json({ error: "templateId is required" });
    }

    const cleanedHtml = extractGlobalPlaceholders(html || '');
    css = deduplicateCSS(css || '');
    css = beautifyCSS(css);

    const safeJs = custom_js || '';

    const query = `
      UPDATE template 
      SET template = ?, css = ?, jscript = ?, custom_jscript = ?, domain_id = ?, updated_at = NOW() 
      WHERE template_id = ?
    `;
    
    db.query(query, [cleanedHtml, css, safeJs, safeJs, domainId || 2, templateId], (err, result) => {
      if (err) {
        console.error("Error saving template:", err);
        return res.status(500).json({ error: "Failed to save template: " + err.message });
      }
      
      console.log("Template saved successfully via /save-template:", result);
      res.status(200).json({ success: true, message: "Template saved successfully!" });
    });
});

// Global Branding Settings Routes
app.get('/global-branding', async (req, res) => {
    const { domain_id, token } = req.query;

    if (!token || !domain_id) {
        return res.status(400).send("domain_id and token are required");
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await dbPromise.query("SELECT * FROM domain_config WHERE id = ?", [domain_id]);
        if (rows.length === 0) {
            return res.status(404).send("Domain config not found");
        }

        res.render('global_branding_editor', {
            domain: rows[0],
            domain_id: domain_id,
            token: token
        });
    } catch (error) {
        console.error("Token validation error:", error.message);
        return res.status(403).send("Invalid or expired token");
    }
});

app.post('/save-global-branding', async (req, res) => {
    const { 
        domain_id, token, logo_url, company_name, company_address, company_phone,
        Banktile, Accountnumber, Ibannumber, bank, swiftcode,
        cover_page_html, inner_page_html, closing_page_html, 
        brand_primary_color, brand_secondary_color, brand_font_family, global_css 
    } = req.body;

    try {
        if (token) jwt.verify(token, process.env.JWT_SECRET);

        await dbPromise.query(
            `UPDATE domain_config 
             SET logo_url = COALESCE(?, logo_url), 
                 company_name = COALESCE(?, company_name),
                 company_address = COALESCE(?, company_address),
                 company_phone = COALESCE(?, company_phone),
                 Banktile = COALESCE(?, Banktile),
                 Accountnumber = COALESCE(?, Accountnumber),
                 Ibannumber = COALESCE(?, Ibannumber),
                 bank = COALESCE(?, bank),
                 swiftcode = COALESCE(?, swiftcode),
                 cover_page_html = COALESCE(?, cover_page_html), 
                 inner_page_html = COALESCE(?, inner_page_html), 
                 closing_page_html = COALESCE(?, closing_page_html), 
                 brand_primary_color = COALESCE(?, brand_primary_color), 
                 brand_secondary_color = COALESCE(?, brand_secondary_color), 
                 brand_font_family = COALESCE(?, brand_font_family), 
                 global_css = COALESCE(?, global_css)
             WHERE id = ?`,
            [
                logo_url || null, company_name || null, company_address || null, company_phone || null,
                Banktile || null, Accountnumber || null, Ibannumber || null, bank || null, swiftcode || null,
                cover_page_html || null, inner_page_html || null, closing_page_html || null,
                brand_primary_color || '#ff4c00', brand_secondary_color || '#0a2540', brand_font_family || 'Arial, sans-serif',
                global_css || null, domain_id
            ]
        );

        res.status(200).json({ success: true, message: "Global domain branding saved successfully!" });
    } catch (error) {
        console.error("Error saving global branding:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/global-branding/:domain_id', async (req, res) => {
    try {
        const { domain_id } = req.params;
        const [rows] = await dbPromise.query("SELECT * FROM domain_config WHERE id = ?", [domain_id]);
        if (rows.length === 0) return res.status(404).json({ error: "Domain not found" });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dedicated Global Branding Settings Table Endpoints
app.get('/api/global-branding-settings/:domain_id', async (req, res) => {
    try {
        const { domain_id } = req.params;
        const [rows] = await dbPromise.query("SELECT * FROM global_branding_settings WHERE domain_id = ?", [domain_id]);
        if (rows.length === 0) {
            const [domainRows] = await dbPromise.query("SELECT * FROM domain_config WHERE id = ?", [domain_id]);
            if (domainRows.length > 0) {
                const d = domainRows[0];
                return res.json({
                    domain_id: domain_id,
                    company_logo: d.logo_url,
                    cover_bg_image: '',
                    inner_bg_image: '',
                    closing_bg_image: '',
                    addon_images: '[]',
                    primary_color: d.brand_primary_color || '#ff4c00',
                    secondary_color: d.brand_secondary_color || '#0a2540',
                    font_family: d.brand_font_family || 'Arial, sans-serif',
                    bank_title: d.Banktile || '',
                    account_number: d.Accountnumber || '',
                    iban_number: d.Ibannumber || '',
                    bank_name: d.bank || ''
                });
            }
            return res.status(404).json({ error: "Branding settings not found" });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/global-branding-settings/save', async (req, res) => {
    try {
        const {
            domain_id, company_logo, cover_bg_image, inner_bg_image, closing_bg_image,
            addon_images, custom_colors, primary_color, secondary_color, font_family,
            bank_title, account_number, iban_number, bank_name, default_table_theme
        } = req.body;

        if (!domain_id) return res.status(400).json({ error: "domain_id is required" });

        const addonJson = Array.isArray(addon_images) ? JSON.stringify(addon_images) : (addon_images || '[]');
        const colorsJson = Array.isArray(custom_colors) ? JSON.stringify(custom_colors) : (custom_colors || '[]');

        await dbPromise.query(`
            INSERT INTO global_branding_settings (
                domain_id, company_logo, cover_bg_image, inner_bg_image, closing_bg_image,
                addon_images, custom_colors, primary_color, secondary_color, font_family,
                bank_title, account_number, iban_number, bank_name, default_table_theme
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                company_logo=COALESCE(VALUES(company_logo), company_logo),
                cover_bg_image=COALESCE(VALUES(cover_bg_image), cover_bg_image),
                inner_bg_image=COALESCE(VALUES(inner_bg_image), inner_bg_image),
                closing_bg_image=COALESCE(VALUES(closing_bg_image), closing_bg_image),
                addon_images=COALESCE(VALUES(addon_images), addon_images),
                custom_colors=COALESCE(VALUES(custom_colors), custom_colors),
                primary_color=COALESCE(VALUES(primary_color), primary_color),
                secondary_color=COALESCE(VALUES(secondary_color), secondary_color),
                font_family=COALESCE(VALUES(font_family), font_family),
                bank_title=COALESCE(VALUES(bank_title), bank_title),
                account_number=COALESCE(VALUES(account_number), account_number),
                iban_number=COALESCE(VALUES(iban_number), iban_number),
                bank_name=COALESCE(VALUES(bank_name), bank_name),
                default_table_theme=COALESCE(VALUES(default_table_theme), default_table_theme)
        `, [
            domain_id, company_logo || null, cover_bg_image || null, inner_bg_image || null, closing_bg_image || null,
            addonJson, colorsJson, primary_color || '#ff4c00', secondary_color || '#0a2540', font_family || 'Arial, sans-serif',
            bank_title || null, account_number || null, iban_number || null, bank_name || null,
            default_table_theme || 'navy-corporate'
        ]);

        // Also update domain_config for legacy compatibility
        await dbPromise.query(`
            UPDATE domain_config
            SET logo_url = COALESCE(?, logo_url),
                brand_primary_color = COALESCE(?, brand_primary_color),
                brand_secondary_color = COALESCE(?, brand_secondary_color),
                brand_font_family = COALESCE(?, brand_font_family),
                Banktile = COALESCE(?, Banktile),
                Accountnumber = COALESCE(?, Accountnumber),
                Ibannumber = COALESCE(?, Ibannumber),
                bank = COALESCE(?, bank)
            WHERE id = ?
        `, [
            company_logo || null, primary_color || '#ff4c00', secondary_color || '#0a2540', font_family || 'Arial, sans-serif',
            bank_title || null, account_number || null, iban_number || null, bank_name || null, domain_id
        ]);

        res.json({ success: true, message: "Global branding settings auto-saved successfully!" });
    } catch (error) {
        console.error("Error saving global branding settings:", error);
        res.status(500).json({ error: error.message });
    }
});

// Global Blocks API Endpoints
app.get('/api/blocks', async (req, res) => {
    try {
        const domainId = req.query.domain_id || 2;
        const [rows] = await dbPromise.query(
            "SELECT * FROM global_blocks WHERE domain_id = ? OR domain_id IS NULL OR domain_id = 0 ORDER BY category ASC, block_name ASC",
            [domainId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/blocks/save', async (req, res) => {
    try {
        const { block_id, block_slug, block_name, category, html_content, css_content, domain_id } = req.body;
        if (!block_slug || !block_name) {
            return res.status(400).json({ error: "block_slug and block_name are required" });
        }

        if (block_id) {
            await dbPromise.query(
                "UPDATE global_blocks SET block_slug=?, block_name=?, category=?, html_content=?, css_content=?, domain_id=? WHERE block_id=?",
                [block_slug, block_name, category || 'General', html_content, css_content, domain_id || 2, block_id]
            );
        } else {
            await dbPromise.query(
                "INSERT INTO global_blocks (block_slug, block_name, category, html_content, css_content, domain_id) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE block_name=VALUES(block_name), html_content=VALUES(html_content)",
                [block_slug, block_name, category || 'General', html_content, css_content, domain_id || 2]
            );
        }
        res.json({ success: true, message: "Block saved successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/blocks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbPromise.query("DELETE FROM global_blocks WHERE block_id = ?", [id]);
        res.json({ success: true, message: "Block deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Delete a template
app.post("/delete-template", (req, res) => {
  const { template_id } = req.body;

  const query = "DELETE FROM template WHERE template_id = ?";
  db.query(query, [template_id], (err, result) => {
    if (err) {
      console.error("Error deleting template:", err);
      return res.status(500).json({ error: "Failed to delete template" });
    }

    console.log("Template deleted successfully:", result);
    res.redirect("/");  // Redirect to the template list after deletion
  });
});


// Clone a template
app.get("/clone-template", (req, res) => {
  const { tmpid } = req.query;

  const query = "SELECT * FROM template WHERE template_id = ?";
  db.query(query, [tmpid], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length === 0) return res.status(404).send("Template not found");

    const template = results[0];
    const cloneQuery = `
      INSERT INTO template (template_title, template, css, jscript, created_user_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(cloneQuery, [template.template_title, template.template, template.css, template.jscript, 1], (err, result) => {
      if (err) return res.status(500).send(err);

      res.redirect("/");  // Redirect back to the template list
    });
  });
});


// Fetch domains API
app.get('/domains', (req, res) => {
    const query = 'SELECT id, domain, company_name FROM domain_config'; // Adjust columns as needed

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        // Send the fetched results as JSON
        res.json(results);
    });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);  // Log the server status
});
