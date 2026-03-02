import google.generativeai as genai
import PIL.Image
import os
from pathlib import Path
from datetime import datetime

# 1. ตั้งค่า API Key จาก environment variable
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set!")

genai.configure(api_key=api_key)

# 2. เลือกโมเดล
model = genai.GenerativeModel('gemini-2.5-flash')

def get_image_explanation(prediction_image_path, graph_image_path):
    """
    วิเคราะห์รูปภาพด้วย Gemini AI
    
    Args:
        prediction_image_path: path ของรูป prediction model
        graph_image_path: path ของรูป technical chart
    
    Returns:
        str: ผลวิเคราะห์จาก Gemini
    """
    try:
        # ตรวจสอบว่าไฟล์มีอยู่
        if not os.path.exists(prediction_image_path):
            raise FileNotFoundError(f"Prediction image not found: {prediction_image_path}")
        if not os.path.exists(graph_image_path):
            raise FileNotFoundError(f"Graph image not found: {graph_image_path}")
        
        # โหลดรูปภาพ
        print(f"Loading prediction image: {prediction_image_path}")
        prediction_img = PIL.Image.open(prediction_image_path)
        
        print(f"Loading graph image: {graph_image_path}")
        graph_img = PIL.Image.open(graph_image_path)
        
        # 3. ส่งรูปไปให้ AI วิเคราะห์
        today_date = datetime.now().strftime("%d %B %Y")
        prompt = f"""
    วิเคราะห์รูปภาพกราฟพยากรณ์ราคานี้โดยวิเคราะห์ร่วมกับรูปtimeframeที่ส่งไปให้(เพื่อสนับสนุนการพยากรณ์ราคา):
    วันที่ปัจจุบัน: {today_date}
    
    1. สรุปแนวโน้มในอนาคต (ขึ้น/ลง/คงที่)
    2. บอก signal tp/sl ของวัันนี้และใช้ RR ให้เหมาะสม (ขอสั้นๆ)
    3. ให้คำแนะนำสั้นๆ หรือคาดการณ์จากข่าวที่จะเกิดขึ้นในแหล่งข่าวจริงๆ ณ วันนั้น แบบสรุป(เพื่อสนับสนุนการคาดการณ์จากรุปภาพ)
    
    **สำคัญ**: ใช้ค.ศ. (Common Era) ในการระบุวันที่ เช่น 6 February 2026 ไม่ใช่พ.ศ.
    
    ตอบเป็นภาษาทางการหน่อย และรวบรัดเข้าใจง่าย
    """
        
        print("Sending request to Gemini API...")
        response = model.generate_content([prompt, prediction_img, graph_img])
        analysis = response.text
        
        return analysis
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return None
    except Exception as e:
        print(f"Error during Gemini API call: {e}")
        raise

def main(prediction_image_path, graph_image_path):
    """
    Main function to analyze images and return trading recommendation
    """
    print("="*80)
    print("XAUUSD Trading Analysis using Gemini AI")
    print("="*80)
    
    analysis = get_image_explanation(prediction_image_path, graph_image_path)
    
    if analysis:
        print("\n" + "="*80)
        print("ANALYSIS RESULT:")
        print("="*80)
        print(analysis)
        print("="*80)
        return analysis
    else:
        print("Failed to get analysis from Gemini API")
        return None

if __name__ == "__main__":
    # Example usage - จะถูกเรียกจาก pipeline script
    prediction_path = "/content/price_prediction_version4.png"
    graph_path = "/content/graph_timeframe_1H.png"
    
    main(prediction_path, graph_path)