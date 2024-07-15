import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';

interface CsvRow {
  [key: string]: string | number;
}

@Injectable()
export class CronProductService {
  constructor(private readonly configService: ConfigService) {}
  async transformRow(json: any) {
    const model = new ChatOpenAI({
      model: 'gpt-3.5-turbo',
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    const prompt = `Transform and map the following JSON to the specified JSON format:
  
  JSON Row: ${JSON.stringify(json)}
  
  Desired JSON Format:
  {
        "name": "HEMOSURE SYRINGE  NEEDLE",
        "type": "non-inventory",
        "shortDescription": "",
        "description": "",
        "vendorId": "VfoeB-qlPBfT4NslMUR_V0zT",
        "manufacturerId": "dNW2ppqvSRGi9P3bFBs59cnT",
        "storefrontPriceVisibility": "members-only",
        "variants": [
          {
            "id": "hcjcdchdpneb",
            "available": true,
            "attributes": {
              "packaging": "BX",
              "description": "Caina Disposable Syringe wNeedle 1cc Luer Slip 25Gx1 100bx"
            },
            "cost": 12,
            "currency": "USD",
            "depth": null,
            "description": "Caina Disposable Syringe wNeedle 1cc Luer Slip 25Gx1 100bx",
            "dimensionUom": null,
            "height": null,
            "width": null,
            "manufacturerItemCode": "SN12510",
            "manufacturerItemId": "10376181",
            "packaging": "BX",
            "price": 16.8,
            "volume": null,
            "volumeUom": null,
            "weight": null,
            "weightUom": null,
            "optionName": "BX, Caina Disposable Syringe wNeedle 1cc Luer Slip 25Gx1 100bx",
            "optionsPath": "bhggiv.pctgaf",
            "optionItemsPath": "raaswx.cxuzfe",
            "sku": "1037618110042723BX",
            "active": true,
            "images": [
              {
                "fileName": "",
                "cdnLink": null,
                "i": 0,
                "alt": null
              }
            ],
            "itemCode": "HSI SN12510"
          }
        ],
        "options": [
          {
            "id": "bhggiv",
            "name": "packaging",
            "dataField": null,
            "values": [
              {
                "id": "raaswx",
                "name": "BX",
                "value": "BX"
              }
            ]
          },
          {
            "id": "pctgaf",
            "name": "description",
            "dataField": null,
            "values": [
              {
                "id": "cxuzfe",
                "name": "Caina Disposable Syringe wNeedle 1cc Luer Slip 25Gx1 100bx",
                "value": "Caina Disposable Syringe wNeedle 1cc Luer Slip 25Gx1 100bx"
              }
            ]
          }
        ],
        "availability": "available",
        "isFragile": false,
        "published": "published",
        "isTaxable": true,
        "images": [
          {
            "fileName": "medtech.png",
            "cdnLink": "https://template-b2b-commerce-business-logic-api-d8039-dev.global.ssl.fastly.net/public/company/2yTnVUyG6H9yRX3K1qIFIiRz/public/nao/productphotos/medtech.png",
            "i": 0,
            "alt": null
          }
        ],
  }`;

    const response = await model.invoke(prompt);

    console.log(response);

    return response;
  }

  async convertCsvToJson(csvFilePath: string, jsonFilePath: string) {
    const results: CsvRow[] = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv({ separator: '\t' }))
      .on('data', async (data) => {
        const mappedJSON = await this.transformRow(data);
        results.push(mappedJSON as any);
      })
      .on('end', async () => {
        await fs.writeFileSync(jsonFilePath, JSON.stringify(results, null, 2));
      })
      .on('error', (error) => {
        console.log(error);
      });
  }

  async splitCsvFile(inputFilePath: string, outputDir: string, parts: number) {
    const fileStreams: fs.WriteStream[] = [];
    let currentPart = 0;
    let currentLine = 0;
    let totalLines = 0;
    let header: string | null = null;

    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // First, count the total number of lines in the CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(inputFilePath)
        .pipe(csv())
        .on('data', () => totalLines++)
        .on('end', resolve)
        .on('error', reject);
    });

    const linesPerPart = Math.ceil(totalLines / parts);

    // Create write streams for each part
    for (let i = 0; i < parts; i++) {
      const outputFilePath = path.join(outputDir, `part_${i + 1}.txt`);
      fileStreams.push(fs.createWriteStream(outputFilePath));
    }

    // Split the CSV file into parts
    fs.createReadStream(inputFilePath)
      .pipe(csv({ separator: '\t' }))
      .on('data', (row) => {
        if (currentLine === 0) {
          // Capture the header
          header = Object.keys(row).join('\t') + '\n';
          fileStreams.forEach((stream) => stream.write(header));
        }

        const rowString = Object.values(row).join('\t') + '\n';

        if (currentLine > 0 && currentLine % linesPerPart === 0) {
          currentPart++;
        }

        fileStreams[currentPart].write(rowString);
        currentLine++;
      })
      .on('end', () => {
        fileStreams.forEach((stream) => stream.end());
      })
      .on('error', (error) => {
        console.error('Error reading the CSV file:', error);
      });
  }

  //1- Split Large CSV file to multiple small files (to distribute high load on CPU instead of processing conversion to JSON on 1 large CSV)
  //2- Convert CSV to JSON
  //3- Map JSON to the Desired Formatted JSON (Manually or by AI)
  //4- Insert to DB
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncProducts() {
    const csvFilePath = path.join(__dirname, '../../images40.txt');
    const jsonFilePath = path.join(__dirname, '../../products.json');
    await this.convertCsvToJson(csvFilePath, jsonFilePath)
      .then(() => {
        console.log('CSV file successfully converted to JSON!');
      })
      .catch((error) => {
        console.error('Error converting CSV to JSON:', error);
      });
  }
}
