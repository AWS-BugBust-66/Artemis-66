import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ArtemisTestModule } from '../../test.module';
import { ManualTextblockSelectionComponent } from 'app/exercises/text/assess/manual-textblock-selection/manual-textblock-selection.component';
import { TextblockAssessmentCardComponent } from 'app/exercises/text/assess/textblock-assessment-card/textblock-assessment-card.component';
import { MockComponent } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { TextBlockRef } from 'app/entities/text-block-ref.model';
import { ManualTextSelectionComponent } from 'app/exercises/text/shared/manual-text-selection/manual-text-selection.component';
import { SubmissionExerciseType, SubmissionType } from 'app/entities/submission.model';
import { TextSubmission } from 'app/entities/text-submission.model';
import { TextBlock } from 'app/entities/text-block.model';

describe('ManualTextblockSelectionComponent', () => {
    let component: ManualTextblockSelectionComponent;
    let fixture: ComponentFixture<ManualTextblockSelectionComponent>;

    const submission = {
        submissionExerciseType: SubmissionExerciseType.TEXT,
        id: 2278,
        submitted: true,
        type: SubmissionType.MANUAL,
        text: 'First text. Second text. Third text. Fourth text. Fifth text.',
    } as unknown as TextSubmission;
    const blocks = [
        {
            text: 'First text.',
            startIndex: 0,
            endIndex: 11,
            submission,
        } as TextBlock,
        {
            text: 'Second text.',
            startIndex: 12,
            endIndex: 24,
            submission,
        } as TextBlock,
        {
            text: 'Third text.',
            startIndex: 25,
            endIndex: 36,
            submission,
        } as TextBlock,
        {
            text: 'Fourth text.',
            startIndex: 37,
            endIndex: 49,
            submission,
        } as TextBlock,
        {
            text: 'Fifth text.',
            startIndex: 50,
            endIndex: 61,
            submission,
        } as TextBlock,
    ];
    const textBlockRefs = [new TextBlockRef(blocks[0]), new TextBlockRef(blocks[1]), new TextBlockRef(blocks[2]), new TextBlockRef(blocks[3]), new TextBlockRef(blocks[4])];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ArtemisTestModule],
            declarations: [ManualTextblockSelectionComponent, MockComponent(TextblockAssessmentCardComponent), MockComponent(ManualTextSelectionComponent)],
        })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(ManualTextblockSelectionComponent);
                component = fixture.componentInstance;
                textBlockRefs[1].initFeedback();
                component.textBlockRefs = textBlockRefs;
                component.submission = submission;
                fixture.detectChanges();
            });
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should add TextBlockRefGroup correctly', () => {
        expect(component.textBlockRefGroups.length).toBe(3);
    });

    it('should add a TextblockAssessmentCardComponent for each TextBlockRefGroup with a feedback', () => {
        const all = fixture.debugElement.queryAll(By.directive(TextblockAssessmentCardComponent));
        expect(all.length).toBe(1);
    });

    it('should add a ManualTextSelectionComponent for each TextBlockRefGroup without a feedback', () => {
        const all = fixture.debugElement.queryAll(By.directive(ManualTextSelectionComponent));
        expect(all.length).toBe(2);
    });

    it('should handle manual text selection correctly', () => {
        jest.spyOn(component.textBlockRefAdded, 'emit');
        component.handleTextSelection('Third text. Fourth text.', component.textBlockRefGroups[2]);
        fixture.detectChanges();

        const textBlockRef = TextBlockRef.new();
        textBlockRef.block!.startIndex = 25;
        textBlockRef.block!.endIndex = 49;
        textBlockRef.block!.setTextFromSubmission(submission);
        textBlockRef.block!.computeId();
        textBlockRef.initFeedback();
        expect(component.textBlockRefAdded.emit).toHaveBeenCalledWith(textBlockRef);
    });
});
