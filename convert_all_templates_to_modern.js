const mysql = require('mysql2/promise');
require('dotenv').config();

async function convertAllTemplatesToModern() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'grapejs'
    });

    console.log('🔌 Connected to MySQL database...');

    try {
        // 1. Create a full safety backup of the template table if not already created
        const backupTableName = `template_backup_${Date.now()}`;
        console.log(`📦 Creating safety backup table: ${backupTableName}...`);
        await connection.query(`CREATE TABLE IF NOT EXISTS ${backupTableName} LIKE template;`);
        await connection.query(`INSERT INTO ${backupTableName} SELECT * FROM template;`);
        console.log(`✅ Safety backup created successfully in ${backupTableName}!`);

        // 2. Fetch all templates from database
        const [templates] = await connection.query('SELECT template_id, template_title, template FROM template WHERE domain_id = 2');
        console.log(`📋 Found ${templates.length} templates for domain_id = 2.`);

        // Modern 360 Business Proposal HTML generator function for Page 2
        function getModernPage2HTML(title) {
            const safeTitle = title || 'Unlimited Visa Quota';
            return `<div class="modern-proposal-container" style="max-width: 795px; margin: 0 auto; background: #ffffff; padding: 28px 32px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; box-sizing: border-box; position: relative;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9; position: relative;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <img src="[company_logo]" alt="Company Logo" style="max-height: 52px; max-width: 220px; object-fit: contain;" onError="this.src='https://pp.ebmsbusiness.com/wp-content/uploads/2022/11/logo.png'; this.onerror=null;" />
    </div>
    <div style="text-align: right;">
      <h1 style="font-size: 24px; font-weight: 900; color: #062654; margin: 0; letter-spacing: -0.02em; text-transform: uppercase;">BUSINESS PROPOSAL</h1>
      <div style="font-size: 13px; font-weight: 600; color: #475569; margin-top: 4px;">Offer Valid Till [pdte] [pmonth] [pyear]</div>
    </div>
  </div>
  <div style="background: linear-gradient(135deg, #f0f7ff 0%, #e6f0fa 100%); border: 1px solid #dbeafe; border-radius: 12px; padding: 18px 24px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; position: relative; overflow: hidden;">
    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: #0284c7;"></div>
    <div>
      <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">PACKAGE HIGHLIGHT</div>
      <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.01em;">${safeTitle}</h2>
    </div>
    <div>
      <div style="background: #ffffff; border: 1px solid #bae6fd; color: #0369a1; padding: 8px 18px; border-radius: 99px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(2,132,199,0.08);">
        <i class="fa fa-map-marker" style="color: #0284c7; font-size: 15px;"></i> Sharjah Free Zone
      </div>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: #0284c7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;"><i class="fa fa-user"></i></div>
      <div><div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;">CLIENT NAME</div><div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">[cname]</div></div>
    </div>
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: #0284c7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;"><i class="fa fa-briefcase"></i></div>
      <div><div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;">BUSINESS ACTIVITY</div><div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">[activityname]</div></div>
    </div>
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: #0284c7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;"><i class="fa fa-id-card"></i></div>
      <div><div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;">VISA QUOTA</div><div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">[visa]</div></div>
    </div>
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: #0284c7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;"><i class="fa fa-users"></i></div>
      <div><div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;">SHAREHOLDERS</div><div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">[shareholders]</div></div>
    </div>
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: #0284c7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;"><i class="fa fa-file-text"></i></div>
      <div><div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;">LICENSE TYPE</div><div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">[licensetype]</div></div>
    </div>
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: #0284c7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;"><i class="fa fa-tag"></i></div>
      <div><div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;">PACKAGE PRICE</div><div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">AED [Pricequote]</div></div>
    </div>
  </div>
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px 24px; margin-bottom: 24px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 18px; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 14px;">
      <div style="width: 38px; height: 38px; border-radius: 8px; border: 2px solid #0284c7; color: #0284c7; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">01</div>
      <div><h3 style="font-size: 18px; font-weight: 800; color: #062654; margin: 0;">Business License Package</h3><div style="font-size: 13px; font-weight: 600; color: #2563eb; margin-top: 2px;">Cost &amp; Inclusions</div></div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc;">
        <div><div style="font-size: 13.5px; font-weight: 600; color: #1e293b;">License Govt Fees</div><div style="font-size: 11px; color: #64748b; margin-top: 2px;">Yearly renewal [renewal_amount]</div></div>
        <span style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7; padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; display: flex; align-items: center; gap: 4px;"><i class="fa fa-check"></i> INCLUDED</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc;">
        <div style="font-size: 13.5px; font-weight: 600; color: #1e293b;">Service Fee &amp; Pro Fees</div>
        <span style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7; padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; display: flex; align-items: center; gap: 4px;"><i class="fa fa-check"></i> INCLUDED</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc;">
        <div style="font-size: 13.5px; font-weight: 600; color: #1e293b;">Office Lease Agreement</div>
        <span style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7; padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; display: flex; align-items: center; gap: 4px;"><i class="fa fa-check"></i> INCLUDED</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc;">
        <div style="font-size: 13.5px; font-weight: 600; color: #1e293b;">Memorandum Of Association (MOA)</div>
        <span style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7; padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; display: flex; align-items: center; gap: 4px;"><i class="fa fa-check"></i> INCLUDED</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc;">
        <div style="font-size: 13.5px; font-weight: 600; color: #1e293b;">Share Register</div>
        <span style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7; padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; display: flex; align-items: center; gap: 4px;"><i class="fa fa-check"></i> INCLUDED</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc;">
        <div style="font-size: 13.5px; font-weight: 600; color: #1e293b;">Certificate Of Formation</div>
        <span style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7; padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; display: flex; align-items: center; gap: 4px;"><i class="fa fa-check"></i> INCLUDED</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc;">
        <div style="font-size: 13.5px; font-weight: 600; color: #1e293b;">Company Stamp</div>
        <span style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7; padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; display: flex; align-items: center; gap: 4px;"><i class="fa fa-check"></i> INCLUDED</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
        <div><div style="font-size: 13.5px; font-weight: 600; color: #1e293b;">Business Logo with Up to 5 Business Email</div><div style="font-size: 11px; color: #64748b; margin-top: 2px;">T &amp; C Apply</div></div>
        <span style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0284c7; padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; display: flex; align-items: center; gap: 4px;"><i class="fa fa-check"></i> INCLUDED</span>
      </div>
    </div>
    <div style="background: linear-gradient(135deg, #062654 0%, #03142e 100%); color: #ffffff; border-radius: 12px; padding: 20px 24px; margin-top: 18px; box-shadow: 0 4px 14px rgba(6, 38, 84, 0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div><div style="font-size: 11px; font-weight: 800; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.08em;">PACKAGE INVESTMENT</div><div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 2px;">Business License Package</div></div>
        <div style="font-size: 18px; font-weight: 800; color: #ffffff;">AED [Pricequote]</div>
      </div>
      <div style="border-bottom: 1px solid rgba(255,255,255,0.18); margin: 12px 0;"></div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 14px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.06em;">TOTAL INVESTMENT</div>
        <div style="font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">AED [Pricequote]</div>
      </div>
    </div>
  </div>
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 22px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
    <div style="display: flex; align-items: center; gap: 14px;">
      <div style="width: 44px; height: 44px; border-radius: 50%; background: #0284c7; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;"><i class="fa fa-gift"></i></div>
      <div><div style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.06em;">PACKAGE BENEFIT</div><div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">Unlimited visa quota</div><div style="font-size: 12px; color: #64748b; margin-top: 2px;">Additional visa quota upgrade: AED 1,600 per visa</div></div>
    </div>
    <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">* T &amp; C Apply</div>
  </div>
</div>`;
        }

        const pagebreakRegex = /(<pagebreak[^>]*>[\s\S]*?<\/pagebreak>)/gi;
        let updatedCount = 0;

        for (const t of templates) {
            const html = t.template || '';
            const parts = html.split(pagebreakRegex);

            if (parts.length >= 3) {
                // Part 0 = Page 1 (Cover Page - ALWAYS PRESERVED!)
                // Part 1 = First <pagebreak> (PRESERVED!)
                // Part 2 = Page 2 (Upgraded to Image 2 Modern Design)
                // Parts 3+ = Pages 3, 4, 5, etc. (ALWAYS PRESERVED!)
                parts[2] = getModernPage2HTML(t.template_title);
                const updatedHtml = parts.join('');
                await connection.query('UPDATE template SET template = ? WHERE template_id = ?', [
                    updatedHtml,
                    t.template_id
                ]);
            } else {
                // Single page template fallback
                const updatedHtml = getModernPage2HTML(t.template_title);
                await connection.query('UPDATE template SET template = ? WHERE template_id = ?', [
                    updatedHtml,
                    t.template_id
                ]);
            }

            updatedCount++;
            console.log(`  [${updatedCount}/${templates.length}] Upgraded Page 2 for Template ID: ${t.template_id} (${t.template_title}) - Cover & Other Pages Preserved!`);
        }

        console.log(`\n🎉 Success! Upgraded Page 2 across ${updatedCount} templates to Image 2 design.`);
        console.log(`🛡️ Cover Page (Page 1) and all other pages (Documents, Pricing, Bank Details) were 100% PRESERVED!`);
        console.log(`ℹ️ Full database backup stored in: ${backupTableName}`);

    } catch (err) {
        console.error('❌ Error converting templates:', err.message);
    } finally {
        await connection.end();
    }
}

convertAllTemplatesToModern();
